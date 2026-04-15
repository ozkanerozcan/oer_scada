/**
 * OPC UA Service
 * Provides browse, test, and real-time polling for OPC UA devices.
 * Uses node-opcua under the hood; gracefully handles missing package.
 *
 * Connection health mirrors the Modbus TCP approach:
 *  - device:status { connected }  broadcast on first successful data or keepalive
 *  - device:status { disconnected } broadcast when session/subscription breaks
 *  - automatic reconnect with exponential backoff (2s -> 4s -> ... -> 30s)
 *  - DATA_UPDATE messages include top-level deviceId so ws.service.js
 *    heartbeat tracker can infer "connected" from live data flow
 */

let opcua = null;
try {
  opcua = require('node-opcua');
} catch (e) {
  console.warn('[OpcUA] node-opcua not installed — OPC UA features disabled. Run: npm install node-opcua');
}

const activeSubscriptions = new Map(); // deviceId -> { client, session, subscription }

// ─── Map OPC UA DataType to our internal type strings ────────────────────────
function mapDataType(opcuaDataTypeId) {
  if (!opcuaDataTypeId) return 'Unknown';
  const id = Number(opcuaDataTypeId);
  const map = {
    1: 'Bool',
    2: 'Int16',
    3: 'Int16',
    4: 'Int16',
    5: 'UInt16',
    6: 'Int32',
    7: 'UInt32',
    8: 'Int32',
    9: 'UInt32',
    10: 'Float32',
    11: 'Float32',
    12: 'String',
  };
  return map[id] || 'Unknown';
}

// ─── Create a connected OPC UA client + session ───────────────────────────────
// Wraps the full connect+session flow in a single Promise with a 10 s timeout.
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
      maxRetry: 1, // We handle retries ourselves
    },
    securityMode: securityModeMap[device.opcuaSecurityMode || 'None'] || opcua.MessageSecurityMode.None,
    securityPolicy: opcua.SecurityPolicy.None,
    endpointMustExist: false,
    requestedSessionTimeout: 60000,
  });

  // Enforce a hard connect timeout
  await Promise.race([
    client.connect(device.opcuaEndpoint),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('OPC UA connect timeout (10s)')), 10000)
    ),
  ]);

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
// Siemens S7 PLCs expose Data Blocks under the Objects folder (i=85).
// Two additional reliability layers vs the naive browse:
//   1. Continuation-point pagination — servers can split large result sets;
//      we loop browseNext() until no continuation point remains.
//   2. All-references fallback — if HierarchicalReferences returns 0 children
//      we retry with no reference-type filter to catch non-standard Siemens
//      reference types (e.g. custom namespace HasComponent-like refs).
async function browseNode(device, nodeId) {
  if (!opcua) throw new Error('node-opcua not installed. Run: npm install node-opcua');

  const { client, session } = await createSession(device);

  try {
    // ── Determine starting node ─────────────────────────────────────────────
    // Default to the Objects folder (i=85) — UA Expert's starting point and
    // the location where Siemens S7 Data Blocks and PLC content are registered.
    const startNodeId = nodeId
      ? opcua.coerceNodeId(nodeId)
      : opcua.coerceNodeId('i=85');

    console.log(`[OpcUA Browse] Browsing nodeId: ${startNodeId.toString()}`);

    // ── Helper: full forward browse with continuation-point pagination ───────
    // A single session.browse() call may only return a partial list if the
    // server enforces a maxReferencesPerNode limit. We must call browseNext()
    // until the continuationPoint buffer is empty.
    const browseAllForward = async (nid, refTypeId = null) => {
      const params = {
        nodeId: nid,
        browseDirection: opcua.BrowseDirection.Forward,
        includeSubtypes: true,
        nodeClassMask: 0,   // all node classes
        resultMask: 63,     // all result attributes
      };
      if (refTypeId) params.referenceTypeId = refTypeId;

      const firstResult = await session.browse(params);
      let allRefs = [...(firstResult.references || [])];
      let cp = firstResult.continuationPoint;

      // Paginate if the server returned a continuation point
      while (cp && cp.length > 0) {
        const nextResult = await session.browseNext(cp, false);
        allRefs = allRefs.concat(nextResult.references || []);
        cp = nextResult.continuationPoint;
      }

      return allRefs;
    };

    // ── Helper: browse forward — tries multiple strategies in order ──────────
    // Siemens S7 TIA Portal uses HasComponent (i=47) and Organizes (i=35).
    // Some versions report these as subtypes of HierarchicalReferences but
    // some firmware variants do not honour includeSubtypes correctly.
    // We therefore try each strategy explicitly and stop at the first hit.
    const browseForward = async (nid) => {
      const strategies = [
        { label: 'HierarchicalReferences (i=33)', id: opcua.resolveNodeId('i=33') },
        { label: 'HasComponent (i=47)',           id: opcua.resolveNodeId('i=47') },
        { label: 'Organizes (i=35)',              id: opcua.resolveNodeId('i=35') },
        { label: 'All references (no filter)',    id: null },
      ];

      for (const { label, id } of strategies) {
        const refs = await browseAllForward(nid, id);
        if (refs.length > 0) {
          console.log(`[OpcUA Browse]   Strategy "${label}" => ${refs.length} ref(s)`);
          return refs;
        }
        console.log(`[OpcUA Browse]   Strategy "${label}" => 0 refs, trying next...`);
      }

      console.warn(`[OpcUA Browse]   All strategies returned 0 references for ${nid.toString()}`);
      return [];
    };

    // ── Helper: fast existence check (minimal resultMask) ───────────────────
    const hasForwardChildren = async (nid) => {
      try {
        // Check HierarchicalReferences first
        const hierarchicalId = opcua.resolveNodeId('i=33');
        const r1 = await session.browse({
          nodeId: nid,
          browseDirection: opcua.BrowseDirection.Forward,
          referenceTypeId: hierarchicalId,
          includeSubtypes: true,
          nodeClassMask: 0,
          resultMask: 1,
        });
        if ((r1.references || []).length > 0) return true;

        // Also check all references (catches non-hierarchical Siemens refs)
        const r2 = await session.browse({
          nodeId: nid,
          browseDirection: opcua.BrowseDirection.Forward,
          includeSubtypes: true,
          nodeClassMask: 0,
          resultMask: 1,
        });
        return (r2.references || []).length > 0;
      } catch {
        return false;
      }
    };

    // ── Helper: extract numeric nodeClass from a reference ──────────────────
    const ncValue = (ref) =>
      typeof ref.nodeClass === 'number'
        ? ref.nodeClass
        : (ref.nodeClass?.value ?? 0);

    // ── Helper: resolve dataType string from OPC UA DataType NodeId ─────────
    const resolveDataType = (dtNodeId) => {
      if (!dtNodeId) return 'Unknown';
      const s = dtNodeId.toString();
      if (s === 'ns=0;i=1'  || s.includes('Boolean'))  return 'Bool';
      if (s === 'ns=0;i=2'  || s.includes('SByte'))    return 'Int16';
      if (s === 'ns=0;i=3'  || (s.includes('Byte') && !s.includes('ByteString'))) return 'UInt16';
      if (s === 'ns=0;i=4'  || (s.includes('Int16') && !s.includes('UInt16')))    return 'Int16';
      if (s === 'ns=0;i=5'  || s.includes('UInt16'))   return 'UInt16';
      if (s === 'ns=0;i=6'  || (s.includes('Int32') && !s.includes('UInt32')))    return 'Int32';
      if (s === 'ns=0;i=7'  || s.includes('UInt32'))   return 'UInt32';
      if (s === 'ns=0;i=8'  || (s.includes('Int64') && !s.includes('UInt64')))    return 'Int32';
      if (s === 'ns=0;i=9'  || s.includes('UInt64'))   return 'UInt32';
      if (s === 'ns=0;i=10' || (s.includes('Float') && !s.includes('Double')))    return 'Float32';
      if (s === 'ns=0;i=11' || s.includes('Double'))   return 'Float32';
      if (s === 'ns=0;i=12' || s.includes('String'))   return 'String';
      return 'Unknown';
    };

    // ── Helper: read current value + data type for a Variable node ──────────
    const readVariableInfo = async (refNodeId) => {
      let value = null;
      let dataType = 'Unknown';
      try {
        const dv = await session.readVariableValue(refNodeId);
        value = dv?.value?.value;
        if (value instanceof Buffer) value = value.toString('hex');
        if (typeof value === 'object' && value !== null) value = JSON.stringify(value);

        const dtResult = await session.read({
          nodeId: refNodeId,
          attributeId: opcua.AttributeIds.DataType,
        });
        const dtNodeId = dtResult?.value?.value;
        dataType = resolveDataType(dtNodeId);
      } catch {
        // Read failed — leave defaults
      }
      return { value, dataType };
    };

    // ── Browse the target node ───────────────────────────────────────────────
    const references = await browseForward(startNodeId);
    console.log(`[OpcUA Browse]   => ${references.length} reference(s) found`);
    if (references.length > 0) {
      // Log the first few refs for diagnostics
      references.slice(0, 5).forEach(r => {
        const nc = typeof r.nodeClass === 'number' ? r.nodeClass : (r.nodeClass?.value ?? 0);
        console.log(`[OpcUA Browse]     nodeId=${r.nodeId?.toString()} name=${r.browseName?.name} class=${nc} refType=${r.referenceTypeId?.toString()}`);
      });
    }

    const nodes = [];
    for (const ref of references) {
      const displayName = ref.displayName?.text || ref.browseName?.name || 'Unknown';
      const refNodeId   = ref.nodeId?.toString() || '';
      const ncVal       = ncValue(ref);

      // OPC UA NodeClass: Object=1, Variable=2, Method=4, ObjectType=8
      const isVariable = ncVal === 2;
      const isMethod   = ncVal === 4;

      let value = null;
      let dataType = 'Unknown';
      if (isVariable) {
        const info = await readVariableInfo(refNodeId);
        value    = info.value;
        dataType = info.dataType;
      }

      // Check hasChildren for ALL node types — Siemens S7 struct/UDT variables
      // expose member variables as children via HasComponent.
      const hasChildren = isMethod ? false : await hasForwardChildren(refNodeId);

      nodes.push({
        nodeId: refNodeId,
        displayName,
        nodeClass: ncVal,
        isFolder: !isVariable,
        isVariable,
        dataType,
        value,
        hasChildren,
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

// ─── Raw diagnostic browse ───────────────────────────────────────────────────
// Returns the completely unprocessed OPC UA browse response for a node.
// Used by the /api/opcua/raw-browse debug endpoint so we can inspect exactly
// what reference types, nodeIds and nodeClasses the Siemens server returns.
async function rawBrowse(device, nodeId) {
  if (!opcua) throw new Error('node-opcua not installed.');
  const { client, session } = await createSession(device);
  try {
    const nid = nodeId ? opcua.coerceNodeId(nodeId) : opcua.coerceNodeId('i=85');

    // Try every reference strategy and collect all unique refs keyed by nodeId string
    const strategies = [
      { label: 'HierarchicalReferences (i=33)', refTypeId: opcua.resolveNodeId('i=33') },
      { label: 'HasComponent (i=47)',           refTypeId: opcua.resolveNodeId('i=47') },
      { label: 'HasProperty (i=46)',            refTypeId: opcua.resolveNodeId('i=46') },
      { label: 'Organizes (i=35)',              refTypeId: opcua.resolveNodeId('i=35') },
      { label: 'All references (no filter)',    refTypeId: null },
    ];

    const results = {};
    for (const { label, refTypeId } of strategies) {
      const params = {
        nodeId: nid,
        browseDirection: opcua.BrowseDirection.Forward,
        includeSubtypes: true,
        nodeClassMask: 0,
        resultMask: 63,
      };
      if (refTypeId) params.referenceTypeId = refTypeId;

      const res = await session.browse(params);
      const refs = (res.references || []).map(r => ({
        nodeId:        r.nodeId?.toString(),
        displayName:   r.displayName?.text || r.displayName?.toString(),
        browseName:    r.browseName?.name || r.browseName?.toString(),
        nodeClass:     typeof r.nodeClass === 'number' ? r.nodeClass : r.nodeClass?.value,
        referenceType: r.referenceTypeId?.toString(),
        isForward:     r.isForward,
        typeDefinition: r.typeDefinition?.toString(),
      }));
      results[label] = refs;
    }

    await session.close();
    await client.disconnect();
    return results;
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

// ─── Real-time polling via OPC UA subscriptions ───────────────────────────────
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

  const watchItems = db.prepare('SELECT * FROM watch_items').all();

  for (const device of devices) {
    const prefix = `${device.name}.OPCUA.`;
    const deviceWatchItems = watchItems.filter(w => w.tagKey.startsWith(prefix));
    if (deviceWatchItems.length === 0) {
      console.log(`[OpcUA] Device "${device.name}" has no watched tags — doing connection health check only.`);
      // Still test connectivity and broadcast real status so the Devices table
      // shows "Connected" or "Disconnected" rather than being stuck on "Connecting..."
      try {
        const { client, session } = await createSession(device);
        await session.close();
        await client.disconnect();
        // Broadcast connected
        const msg = JSON.stringify({ type: 'device:status', payload: { deviceId: device.id, status: 'connected' } });
        fastify.websocketServer.clients.forEach(ws => { if (ws.readyState === 1) ws.send(msg); });
        console.log(`[OpcUA] Device "${device.name}" is reachable (no tags monitored yet).`);
      } catch (err) {
        const msg = JSON.stringify({ type: 'device:status', payload: { deviceId: device.id, status: 'disconnected' } });
        fastify.websocketServer.clients.forEach(ws => { if (ws.readyState === 1) ws.send(msg); });
        console.warn(`[OpcUA] Device "${device.name}" is NOT reachable: ${err.message}`);
      }
      continue;
    }

    // ── Status broadcast helper ────────────────────────────────────────────────
    const broadcastStatus = (status) => {
      const msg = JSON.stringify({ type: 'device:status', payload: { deviceId: device.id, status } });
      fastify.websocketServer.clients.forEach(ws => {
        if (ws.readyState === 1) ws.send(msg);
      });
    };

    // ── Session setup (called on initial start and every reconnect) ────────────
    let reconnectTimer = null;
    let isDeviceOnline = false;

    const scheduleReconnect = (delayMs = 2000) => {
      if (reconnectTimer) return;
      reconnectTimer = setTimeout(async () => {
        reconnectTimer = null;
        // Tear down any stale session before reconnecting
        const existing = activeSubscriptions.get(device.id);
        if (existing) {
          try { await existing.subscription.terminate(); } catch {}
          try { await existing.session.close(); } catch {}
          try { await existing.client.disconnect(); } catch {}
          activeSubscriptions.delete(device.id);
        }
        await setupSession(device, delayMs);
      }, delayMs);
    };

    const setupSession = async (dev, previousBackoff = 1000) => {
      try {
        console.log(`[OpcUA] Connecting to "${dev.name}" at ${dev.opcuaEndpoint}...`);
        const { client, session } = await createSession(dev);

        // Session-level error / close -> schedule reconnect
        session.on('session_closed', () => {
          console.warn(`[OpcUA] Session closed for "${dev.name}"`);
          if (isDeviceOnline) {
            isDeviceOnline = false;
            broadcastStatus('disconnected');
          }
          scheduleReconnect(2000);
        });

        client.on('connection_lost', () => {
          console.warn(`[OpcUA] Connection lost to "${dev.name}"`);
          if (isDeviceOnline) {
            isDeviceOnline = false;
            broadcastStatus('disconnected');
          }
        });

        client.on('connection_reestablished', () => {
          console.log(`[OpcUA] Connection re-established to "${dev.name}"`);
          // The subscription should auto-recover; mark online when data resumes
        });

        const subscription = await session.createSubscription2({
          requestedPublishingInterval: 1000,
          requestedLifetimeCount: 100,
          requestedMaxKeepAliveCount: 10,
          maxNotificationsPerPublish: 100,
          publishingEnabled: true,
          priority: 10,
        });

        // Subscription health events
        subscription.on('keepalive', () => {
          // The server is alive and publishing — mark device online if not already
          if (!isDeviceOnline) {
            isDeviceOnline = true;
            broadcastStatus('connected');
            console.log(`[OpcUA] Device "${dev.name}" is ONLINE (keepalive)`);
          }
        });

        subscription.on('status_changed', (status, diagnosticInfo) => {
          console.warn(`[OpcUA] Subscription status changed for "${dev.name}": ${status?.toString()}`);
        });

        subscription.on('terminated', () => {
          console.warn(`[OpcUA] Subscription terminated for "${dev.name}"`);
          if (isDeviceOnline) {
            isDeviceOnline = false;
            broadcastStatus('disconnected');
          }
          scheduleReconnect(2000);
        });

        // Monitor each watched tag
        for (const wi of deviceWatchItems) {
          const nodeId = wi.tagKey.substring(prefix.length);
          try {
            const monitoredItem = await subscription.monitor(
              { nodeId, attributeId: opcua.AttributeIds.Value },
              { samplingInterval: 1000, discardOldest: true, queueSize: 10 },
              opcua.TimestampsToReturn.Both
            );

            monitoredItem.on('changed', (dataValue) => {
              if (dataValue?.value?.value === undefined || dataValue.value.value === null) return;
              let val = dataValue.value.value;
              if (val instanceof Buffer) val = val.toString('hex');

              // Mark online on first value received
              if (!isDeviceOnline) {
                isDeviceOnline = true;
                broadcastStatus('connected');
                console.log(`[OpcUA] Device "${dev.name}" is ONLINE (first data)`);
              }

              // Include deviceId at top level so ws.service.js heartbeat tracks it
              const message = JSON.stringify({
                type: 'DATA_UPDATE',
                deviceId: dev.id,
                payload: { [wi.tagKey]: val },
              });
              fastify.websocketServer.clients.forEach(ws => {
                if (ws.readyState === 1) ws.send(message);
              });
            });

            monitoredItem.on('err', (err) => {
              console.error(`[OpcUA] MonitoredItem error for "${wi.tagKey}": ${err.message}`);
            });
          } catch (monErr) {
            console.error(`[OpcUA] Failed to monitor "${wi.tagKey}": ${monErr.message}`);
          }
        }

        activeSubscriptions.set(dev.id, { client, session, subscription });
        console.log(`[OpcUA] Connected to "${dev.name}" — monitoring ${deviceWatchItems.length} tag(s)`);

        // Broadcast connected immediately on session creation (before first data)
        if (!isDeviceOnline) {
          isDeviceOnline = true;
          broadcastStatus('connected');
          console.log(`[OpcUA] Device "${dev.name}" is ONLINE (session ready)`);
        }

      } catch (err) {
        console.error(`[OpcUA] Failed to connect to "${dev.name}": ${err.message}`);
        if (isDeviceOnline) {
          isDeviceOnline = false;
        }
        broadcastStatus('disconnected');
        // Exponential backoff, cap at 30s
        scheduleReconnect(Math.min(previousBackoff * 2, 30000));
      }
    };

    // Kick off initial connection
    await setupSession(device);
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
  setTimeout(() => startOpcUaPolling(fastify, deviceId ? Number(deviceId) : null), 200);
}

module.exports = { browseNode, rawBrowse, testConnection, startOpcUaPolling, stopOpcUaPolling, restartPolling };
