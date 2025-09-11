-- Create nischen table
CREATE TABLE public.nischen (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nische TEXT NOT NULL,
  empfaenger INTEGER NOT NULL,
  bestandsliste_path TEXT,
  transporter_dropbox_url TEXT,
  pkw_dropbox_url TEXT,
  kanzlei TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.nischen ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own nischen" 
ON public.nischen 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own nischen" 
ON public.nischen 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nischen" 
ON public.nischen 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own nischen" 
ON public.nischen 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_nischen_updated_at
BEFORE UPDATE ON public.nischen
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for bestandslisten
INSERT INTO storage.buckets (id, name, public) VALUES ('bestandslisten', 'bestandslisten', false);

-- Create policies for bestandslisten uploads
CREATE POLICY "Users can view their own bestandslisten" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'bestandslisten' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own bestandslisten" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'bestandslisten' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own bestandslisten" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'bestandslisten' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own bestandslisten" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'bestandslisten' AND auth.uid()::text = (storage.foldername(name))[1]);