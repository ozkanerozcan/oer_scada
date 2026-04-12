// Placeholder for frontend API configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const login = async (username, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!response.ok) throw new Error('Login failed');
  return response.json();
};

export const getDevices = async () => {
  const response = await fetch(`${API_BASE_URL}/devices`);
  if (!response.ok) throw new Error('Failed to load devices');
  return response.json();
};

export const createDevice = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return response.json();
};

export const updateDevice = async (id, payload) => {
  const response = await fetch(`${API_BASE_URL}/devices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return response.json();
};

export const deleteDevice = async (id) => {
  const response = await fetch(`${API_BASE_URL}/devices/${id}`, {
    method: 'DELETE'
  });
  return response.json();
};

export const testDevicePing = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/devices/ping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return response.json();
};

export const testModbusDirect = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/modbus/direct`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return response.json();
};

export const getTags = async () => {
  const response = await fetch(`${API_BASE_URL}/tags`);
  if (!response.ok) throw new Error('Failed to load tags');
  return response.json();
};

export const createTag = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error('Failed to create tag');
  return response.json();
};

export const updateTag = async (id, payload) => {
  const response = await fetch(`${API_BASE_URL}/tags/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error('Failed to update tag');
  return response.json();
};

export const deleteTag = async (id) => {
  const response = await fetch(`${API_BASE_URL}/tags/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete tag');
  return response.json();
};

export const getWatchItems = async () => {
  const response = await fetch(`${API_BASE_URL}/watch`);
  return response.json();
};

export const addWatchItem = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/watch`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  return response.json();
};

export const deleteWatchItem = async (id) => {
  const response = await fetch(`${API_BASE_URL}/watch/${id}`, { method: 'DELETE' });
  return response.json();
};

export const reorderWatchItems = async (items) => {
  const response = await fetch(`${API_BASE_URL}/watch/reorder`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items })
  });
  return response.json();
};

export const getDashboards = async () => {
  const response = await fetch(`${API_BASE_URL}/dashboards`);
  if (!response.ok) throw new Error('Failed to load dashboards');
  return response.json();
};

export const createDashboard = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/dashboards`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error('Failed to create dashboard');
  return response.json();
};

export const updateDashboard = async (id, payload) => {
  const response = await fetch(`${API_BASE_URL}/dashboards/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error('Failed to update dashboard');
  return response.json();
};

export const deleteDashboard = async (id) => {
  const response = await fetch(`${API_BASE_URL}/dashboards/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete dashboard');
  return response.json();
};

export const browseOpcUaNode = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/opcua/browse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return response.json();
};

export const testOpcUaConnection = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/opcua/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return response.json();
};
