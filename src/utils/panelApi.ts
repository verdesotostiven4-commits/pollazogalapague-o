export type PanelType = 'admin' | 'delivery';

const detectPanel = (): PanelType => {
  return window.location.pathname === '/repartidor' ? 'delivery' : 'admin';
};

export const runPanelAction = async <T>(
  action: string,
  payload: Record<string, unknown> = {},
  panel: PanelType = detectPanel()
): Promise<T> => {
  const response = await fetch('/api/panel-action', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ panel, action, payload }),
  });

  const result = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    data?: T;
  };

  if (!response.ok || !result.ok) {
    throw new Error(result.error || 'No se pudo completar la acción segura.');
  }

  return result.data as T;
};
