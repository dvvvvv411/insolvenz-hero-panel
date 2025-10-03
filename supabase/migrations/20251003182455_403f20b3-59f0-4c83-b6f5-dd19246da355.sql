-- Create table for tracking unread items (team-synchronized)
CREATE TABLE IF NOT EXISTS public.interessenten_unread_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interessent_id uuid NOT NULL REFERENCES public.interessenten(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  has_unread_notiz boolean DEFAULT false,
  has_unread_call boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(interessent_id, user_id)
);

-- Enable RLS
ALTER TABLE public.interessenten_unread_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Team can view all unread items"
  ON public.interessenten_unread_items
  FOR SELECT
  USING (true);

CREATE POLICY "Team can insert unread items"
  ON public.interessenten_unread_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Team can update all unread items"
  ON public.interessenten_unread_items
  FOR UPDATE
  USING (true);

CREATE POLICY "Team can delete all unread items"
  ON public.interessenten_unread_items
  FOR DELETE
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_interessenten_unread_items_updated_at
  BEFORE UPDATE ON public.interessenten_unread_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();