/*
  # Add increment_metric RPC function

  Creates a safe server-side function to atomically increment a metric counter.
  This prevents race conditions when multiple users update the same counter simultaneously.

  ## New Functions
  - `increment_metric(metric_id text)` — increments value by 1 for the given metric ID
*/

CREATE OR REPLACE FUNCTION increment_metric(metric_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE app_metrics
  SET value = value + 1, updated_at = now()
  WHERE id = metric_id;
END;
$$;

-- Allow anon and authenticated to call this function
GRANT EXECUTE ON FUNCTION increment_metric(text) TO anon;
GRANT EXECUTE ON FUNCTION increment_metric(text) TO authenticated;
