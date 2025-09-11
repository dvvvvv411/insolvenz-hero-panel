-- Create interessenten table
CREATE TABLE public.interessenten (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  unternehmensname TEXT NOT NULL,
  ansprechpartner TEXT NOT NULL,
  email TEXT NOT NULL,
  telefonnummer TEXT NOT NULL,
  mobilfunknummer TEXT,
  nische TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Mail raus',
  call_notwendig TEXT NOT NULL DEFAULT 'Kein Call notwendig',
  call_notwendig_grund TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create interessenten_email_verlauf table
CREATE TABLE public.interessenten_email_verlauf (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  interessent_id UUID NOT NULL REFERENCES public.interessenten(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  screenshot_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create interessenten_calls table
CREATE TABLE public.interessenten_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  interessent_id UUID NOT NULL REFERENCES public.interessenten(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  typ TEXT NOT NULL DEFAULT 'Call', -- 'Call' or 'Mailbox'
  notiz TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create interessenten_notizen table
CREATE TABLE public.interessenten_notizen (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  interessent_id UUID NOT NULL REFERENCES public.interessenten(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  notiz TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.interessenten ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interessenten_email_verlauf ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interessenten_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interessenten_notizen ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for interessenten
CREATE POLICY "Users can view their own interessenten" 
ON public.interessenten 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own interessenten" 
ON public.interessenten 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interessenten" 
ON public.interessenten 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interessenten" 
ON public.interessenten 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for interessenten_email_verlauf
CREATE POLICY "Users can view their own email verlauf" 
ON public.interessenten_email_verlauf 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own email verlauf" 
ON public.interessenten_email_verlauf 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email verlauf" 
ON public.interessenten_email_verlauf 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for interessenten_calls
CREATE POLICY "Users can view their own calls" 
ON public.interessenten_calls 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own calls" 
ON public.interessenten_calls 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calls" 
ON public.interessenten_calls 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calls" 
ON public.interessenten_calls 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for interessenten_notizen
CREATE POLICY "Users can view their own notizen" 
ON public.interessenten_notizen 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notizen" 
ON public.interessenten_notizen 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notizen" 
ON public.interessenten_notizen 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notizen" 
ON public.interessenten_notizen 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create storage bucket for email screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('email-screenshots', 'email-screenshots', false);

-- Create storage policies for email screenshots
CREATE POLICY "Users can view their own email screenshots" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'email-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own email screenshots" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'email-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own email screenshots" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'email-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_interessenten_updated_at
BEFORE UPDATE ON public.interessenten
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();