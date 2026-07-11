export const runAdminOperation = async <T>(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<T> => {
  const response = await fetch('/api/admin-operations', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  });

  const result = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    data?: T;
  };

  if (!response.ok || !result.ok) {
    throw new Error(
      result.error || 'No se pudo completar la operación administrativa.'
    );
  }

  return result.data as T;
};
