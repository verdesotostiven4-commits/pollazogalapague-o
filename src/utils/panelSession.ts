export type PanelType = 'admin' | 'delivery';

export const logoutPanelSession = async (panel: PanelType) => {
  try {
    await fetch('/api/logout-panel-session', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ panel }),
    });
  } finally {
    sessionStorage.removeItem('pollazo_admin_auth');
    sessionStorage.removeItem('pollazo_delivery_auth');
    window.location.reload();
  }
};
