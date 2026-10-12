export type RiskMapHistoryInput = {
  queryType: 'point' | 'area' | 'portfolio';
  label: string;
  region?: string;
  geometry: Record<string, unknown>;
  summary: Record<string, unknown>;
  result: unknown;
};

export type RiskMapHistoryRecord = {
  id: number;
  username?: string;
  query_type: 'point' | 'area' | 'portfolio';
  label: string;
  region?: string;
  geometry: { type: string; coordinates: unknown };
  summary: Record<string, any>;
  created_at: string;
};

const CLIENT_ID_KEY = 'natcat-riskmap-client-id';

function createClientId(): string {
  if (typeof window.crypto?.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  if (typeof window.crypto?.getRandomValues === 'function') {
    const bytes = window.crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  return `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function getRiskMapClientId(): string | null {
  if (typeof window === 'undefined') return null;
  let clientId = window.localStorage.getItem(CLIENT_ID_KEY);
  if (!clientId) {
    clientId = createClientId();
    window.localStorage.setItem(CLIENT_ID_KEY, clientId);
  }
  return clientId;
}

export async function saveRiskMapQueryHistory(input: RiskMapHistoryInput): Promise<void> {
  const clientId = getRiskMapClientId();
  if (!clientId) return;
  try {
    const response = await fetch('/api/risk-map/query-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...input,
        clientId,
        username: window.localStorage.getItem('username') || undefined,
      }),
      keepalive: true,
    });
    if (!response.ok) throw new Error(`History API returned ${response.status}`);
  } catch (error) {
    console.warn('Risk Map query history was not saved:', error);
  }
}

export async function listRiskMapQueryHistory(): Promise<RiskMapHistoryRecord[]> {
  const clientId = getRiskMapClientId();
  if (!clientId) return [];
  const response = await fetch(`/api/risk-map/query-history?clientId=${encodeURIComponent(clientId)}`);
  if (!response.ok) throw new Error(`History API returned ${response.status}`);
  const payload = await response.json();
  return payload.records || [];
}

export async function deleteRiskMapQueryHistory(id: number): Promise<void> {
  const clientId = getRiskMapClientId();
  if (!clientId) return;
  const response = await fetch(
    `/api/risk-map/query-history?clientId=${encodeURIComponent(clientId)}&id=${id}`,
    { method: 'DELETE' },
  );
  if (!response.ok) throw new Error(`History API returned ${response.status}`);
}