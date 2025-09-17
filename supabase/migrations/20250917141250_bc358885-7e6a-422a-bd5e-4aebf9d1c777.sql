-- Create user_status_settings table to store all status data
CREATE TABLE public.user_status_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  status text NOT NULL,
  color text NOT NULL DEFAULT '#6b7280',
  order_position integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_status UNIQUE(user_id, status),
  CONSTRAINT unique_user_order UNIQUE(user_id, order_position)
);

-- Enable Row Level Security
ALTER TABLE public.user_status_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own status settings" 
ON public.user_status_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own status settings" 
ON public.user_status_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own status settings" 
ON public.user_status_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own status settings" 
ON public.user_status_settings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_status_settings_updated_at
BEFORE UPDATE ON public.user_status_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();