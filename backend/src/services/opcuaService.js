/**
 * OPC UA Service
 * Provides browse, test, and real-time polling for OPC UA devices.
 * Uses node-opcua under the hood; gracefully handles missing package.
 */

let opcua = null;
try {
  opcua = require('node-opcua');
} catch (e) {
  console.warn('[OpcUA] node-opcua not installed — OPC UA features disabled. Run: npm install node-opcua');
}

const activeSubscriptions = new Map(); // deviceId -> { session, subscription, client }

// ─── Map OPC UA DataType to our internal type strings ────────────────────────
function mapDataType(opcuaDataTypeId) {
  if (!opcuaDataTypeId) return 'Unknown';
  const id = Number(opcuaDataTypeId);
  const map = {
    1: 'Bool',
    2: 'Int16',   // SByte
    3: 'Int16',   // Byte  
    4: 'Int16',
    5: 'UInt16',
    6: 'Int32',
    7: 'UInt32',
    8: 'Int32',   // Int64 (clamped)
    9: 'UInt32',  // UInt64 (clamped)
    10: 'Float32',
    11: 'Float32', // Double (clamped)
    12: 'String',
  };
  return map[id] || 'Unknown';
}

// ─── Create a connected OPC UA client + session ───────────────────────────────
async function createSession(device) {
  if (!opcua) throw new Error('node-opcua not installed');

  const securityModeMap = {
    'None': opcua.MessageSecurityMode.None,
    'Sign': opcua.MessageSecurityMode.Sign,
    'SignAndEncrypt': opcua.MessageSecurityMode.SignAndEncrypt,
  };

  const client = opcua.OPCUAClient.create({
    applicationName: 'OER_SCADA',
    connectionStrategy: {
      initialDelay: 1000,
      maxRetry: 1,
    },
    securityMode: securityModeMap[device.opcuaSecurityMode || 'None'] || opcua.MessageSecurityMode.None,
    securityPolicy: opcua.SecurityPolicy.None,
    endpointMustExist: false,
    requestedSessionTimeout: 60000,
  });

  await client.connect(device.opcuaEndpoint);

  let session;
  if (device.opcuaUsername) {
    session = await client.createSession({
      type: opcua.UserTokenType.UserName,
      userName: device.opcuaUsername,
      password: device.opcuaPassword || '',
    });
  } else {
    session = await client.createSession();
  }

  return { client, session };
}

// ─── Browse a node ────────────────────────────────────────────────────────────
async function browseNode(device, nodeId) {
  if (!opcua) throw new Error('node-opcua not installed. Run: npm install node-opcua');

  const { client, session } = await createSession(device);

  try {
    const nodeToBrowse = nodeId || opcua.ObjectIds.RootFolder;
    const browseResult = await session.browse(nodeToBrowse);

    const nodes = [];
    for (const ref of (browseResult.references || [])) {
      const displayName = ref.displayName?.text || ref.browseName?.name || 'Unknown';
      const refNodeId = ref.nodeId?.toString() || '';
      const isFolder = ref.nodeClass === opcua.NodeClass.Object || ref.nodeClass === opcua.NodeClass.View;
      const isVariable = ref.nodeClass === opcua.NodeClass.Variable;

      // For variable nodes, try to read current value and dataType
      let value = null;
      let dataType = 'Unknown';
      if (isVariable) {
        try {
          const dv = await session.readVariableValue(refNodeId);
          value = dv?.value?.value;
          if (value instanceof Buffer) value = value.toString('hex');
          if (typeof value === 'object' && value !== null) value = JSON.stringify(value);

          const attrs = await session.readAttributes(refNodeId, [opcua.AttributeIds.DataType]);
          const dtNodeId = attrs?.[0]?.value?.value;
          if (dtNodeId) {
            // Map common OPC UA data type node IDs
            const dtStr = dtNodeId.toString();
            if (dtStr.includes('Boolean') || dtStr === 'ns=0;i=1') dataType = 'Bool';
            else if (dtStr.includes('Int16') || dtStr === 'ns=0;i=4') dataType = 'Int16';
            else if (dtStr.includes('UInt16') || dtStr === 'ns=0;i=5') dataType = 'UInt16';
            else if (dtStr.includes('Int32') || dtStr === 'ns=0;i=6') dataType = 'Int32';
            else if (dtStr.includes('UInt32') || dtStr === 'ns=0;i=7') dataType = 'UInt32';
            else if (dtStr.includes('Float') || dtStr === 'ns=0;i=10') dataType = 'Float32';
            else if (dtStr.includes('Double') || dtStr === 'ns=0;i=11') dataType = 'Float32';
            else if (dtStr.includes('String') || dtStr === 'ns=0;i=12') dataType = 'String';
            else dataType = 'Unknown';
          }
        } catch (e) {
          // Read failed — just leave defaults
        }
      }

      nodes.push({
        nodeId: refNodeId,
        displayName,
        nodeClass: ref.nodeClass,
        isFolder,
        isVariable,
        dataType,
        value,
        hasChildren: isFolder,
      });
    }

    await session.close();
    await client.disconnect();

    return nodes;
  } catch (err) {
    try { await session.close(); } catch {}
    try { await client.disconnect(); } catch {}
    throw err;
  }
}

// ─── Test connection ──────────────────────────────────────────────────────────
async function testConnection(device) {
  if (!opcua) throw new Error('node-opcua not installed. Run: npm install node-opcua');
  const { client, session } = await createSession(device);
  await session.close();
  await client.disconnect();
}

// ─── Real-time polling via subscriptions ─────────────────────────────────────
async function startOpcUaPolling(fastify, specificId = null) {
  if (!opcua) {
    console.warn('[OpcUA] node-opcua not installed — skipping OPC UA polling.');
    return;
  }

  const db = require('../database/db');
  let devices;
  if (specificId) {
    devices = db.prepare("SELECT * FROM devices WHERE id=? AND enabled=1 AND type='OPC UA'").all(specificId);
  } else {
    devices = db.prepare("SELECT * FROM devices WHERE enabled=1 AND type='OPC UA'").all();
  }

  // Fetch all watch items for OPC UA — tagKey format: {deviceName}.OPCUA.{nodeId}
  const watchItems = db.prepare('SELECT * FROM watch_items').all();

  for (const device of devices) {
    // Find watch items belonging to this device
    const prefix = `${device.name}.OPCUA.`;
    const deviceWatchItems = watchItems.filter(w => w.tagKey.startsWith(prefix));
    if (deviceWatchItems.length === 0) {
      console.log(`[OpcUA] Device "${device.name}" has no watched OPC UA tags. Skipping.`);
      continue;
    }

    try {
      const { client, session } = await createSession(device);
      console.log(`[OpcUA] Connected to "${device.name}" at ${device.opcuaEndpoint}`);

      const subscription = await session.createSubscription2({
        requestedPublishingInterval: 1000,
        requestedLifetimeCount: 100,
        requestedMaxKeepAliveCount: 10,
        maxNotificationsPerPublish: 100,
        publishingEnabled: true,
        priority: 10,
      });

      const payload = {};

      for (const wi of deviceWatchItems) {
        const nodeId = wi.tagKey.substring(prefix.length);
        const monitoredItem = await subscription.monitor(
          { nodeId, attributeId: opcua.AttributeIds.Value },
          { samplingInterval: 1000, discardOldest: true, queueSize: 10 },
          opcua.TimestampsToReturn.Both
        );

        monitoredItem.on('changed', (dataValue) => {
          if (dataValue?.value?.value === undefined || dataValue.value.value === null) return;
          let val = dataValue.value.value;
          if (val instanceof Buffer) val = val.toString('hex');
          payload[wi.tagKey] = val;

          const message = JSON.stringify({ type: 'DATA_UPDATE', payload: { [wi.tagKey]: val } });
          fastify.websocketServer.clients.forEach(ws => {
            if (ws.readyState === 1) ws.send(message);
          });
        });
      }

      activeSubscriptions.set(device.id, { client, session, subscription });

    } catch (err) {
      console.error(`[OpcUA] Failed to connect to "${device.name}": ${err.message}`);
    }
  }
}

// ─── Stop & Restart ───────────────────────────────────────────────────────────
async function stopOpcUaPolling(deviceId = null) {
  if (deviceId) {
    const entry = activeSubscriptions.get(Number(deviceId));
    if (entry) {
      try { await entry.subscription.terminate(); } catch {}
      try { await entry.session.close(); } catch {}
      try { await entry.client.disconnect(); } catch {}
      activeSubscriptions.delete(Number(deviceId));
    }
  } else {
    for (const [id, entry] of activeSubscriptions) {
      try { await entry.subscription.terminate(); } catch {}
      try { await entry.session.close(); } catch {}
      try { await entry.client.disconnect(); } catch {}
    }
    activeSubscriptions.clear();
  }
}

async function restartPolling(fastify, deviceId = null) {
  await stopOpcUaPolling(deviceId);
  setTimeout(() => startOpcUaPolling(fastify, deviceId), 200);
}

module.exports = { browseNode, testConnection, startOpcUaPolling, stopOpcUaPolling, restartPolling };
