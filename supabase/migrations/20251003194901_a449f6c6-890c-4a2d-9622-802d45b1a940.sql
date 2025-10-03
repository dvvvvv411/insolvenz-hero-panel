-- Create team_chat table for live chat messages
CREATE TABLE public.team_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.team_chat ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Team can view all messages"
  ON public.team_chat
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Team can create messages"
  ON public.team_chat
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Enable Realtime
ALTER TABLE public.team_chat REPLICA IDENTITY FULL;