CREATE TABLE IF NOT EXISTS public.schedule_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_schedule_shares_token ON public.schedule_shares(token);
CREATE INDEX IF NOT EXISTS idx_schedule_shares_created_by ON public.schedule_shares(created_by);
CREATE INDEX IF NOT EXISTS idx_schedule_shares_expires_at ON public.schedule_shares(expires_at);

ALTER TABLE public.schedule_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create their own schedule shares" ON public.schedule_shares;
CREATE POLICY "Users can create their own schedule shares"
ON public.schedule_shares
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Direct reads are owner-only. Importing someone else's shared schedule goes
-- through the SECURITY DEFINER function below, which requires knowledge of the
-- unguessable token (see migration 019). The previous policy exposed every
-- non-expired share (incl. teacher names + created_by) to any logged-in user.
DROP POLICY IF EXISTS "Authenticated users can read active schedule shares" ON public.schedule_shares;
DROP POLICY IF EXISTS "Users can read their own schedule shares" ON public.schedule_shares;
CREATE POLICY "Users can read their own schedule shares"
ON public.schedule_shares
FOR SELECT
USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can delete their own schedule shares" ON public.schedule_shares;
CREATE POLICY "Users can delete their own schedule shares"
ON public.schedule_shares
FOR DELETE
USING (auth.uid() = created_by);

CREATE OR REPLACE FUNCTION public.get_schedule_share(share_token UUID)
RETURNS TABLE (payload JSONB, expires_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT s.payload, s.expires_at
  FROM public.schedule_shares s
  WHERE s.token = share_token;
$$;

REVOKE ALL ON FUNCTION public.get_schedule_share(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_schedule_share(UUID) TO authenticated;