-- Create new table for tracking individual unread items
CREATE TABLE public.unread_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id uuid NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('notiz', 'call')),
  interessent_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, item_id, item_type)
);

-- Enable RLS
ALTER TABLE public.unread_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all unread items"
  ON public.unread_items FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own unread items"
  ON public.unread_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own unread items"
  ON public.unread_items FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_unread_items_user_type 
  ON public.unread_items(user_id, item_type);

-- Drop the old table since we're replacing it with a better design
DROP TABLE IF EXISTS public.interessenten_unread_items;