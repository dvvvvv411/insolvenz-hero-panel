-- Create the interessenten_aktivitaeten table
CREATE TABLE public.interessenten_aktivitaeten (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  interessent_id UUID NOT NULL,
  user_id UUID NOT NULL,
  aktivitaets_typ TEXT NOT NULL,
  alter_wert TEXT,
  neuer_wert TEXT,
  beschreibung TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.interessenten_aktivitaeten ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own aktivitaeten" 
ON public.interessenten_aktivitaeten 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own aktivitaeten" 
ON public.interessenten_aktivitaeten 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own aktivitaeten" 
ON public.interessenten_aktivitaeten 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX idx_aktivitaeten_interessent_id ON public.interessenten_aktivitaeten(interessent_id);
CREATE INDEX idx_aktivitaeten_created_at ON public.interessenten_aktivitaeten(created_at DESC);