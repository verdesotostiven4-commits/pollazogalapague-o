export type AdminPosToolKey = 'pos' | 'inventory' | 'reports' | 'corrections' | 'catalog';

export const ADMIN_POS_TOOL_EVENT = 'pollazo:admin-pos-tool-open';

export const openAdminPosTool = (tool: AdminPosToolKey) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<AdminPosToolKey>(ADMIN_POS_TOOL_EVENT, { detail: tool }));
};

export const onAdminPosToolOpen = (handler: (tool: AdminPosToolKey) => void) => {
  if (typeof window === 'undefined') return () => undefined;

  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<AdminPosToolKey>;
    handler(customEvent.detail);
  };

  window.addEventListener(ADMIN_POS_TOOL_EVENT, listener);
  return () => window.removeEventListener(ADMIN_POS_TOOL_EVENT, listener);
};
