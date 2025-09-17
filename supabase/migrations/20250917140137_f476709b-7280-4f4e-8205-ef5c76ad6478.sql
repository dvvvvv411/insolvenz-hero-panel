-- Create table for user status colors
CREATE TABLE public.user_status_colors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, status)
);

-- Enable Row Level Security
ALTER TABLE public.user_status_colors ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own status colors" 
ON public.user_status_colors 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own status colors" 
ON public.user_status_colors 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own status colors" 
ON public.user_status_colors 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own status colors" 
ON public.user_status_colors 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_status_colors_updated_at
BEFORE UPDATE ON public.user_status_colors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();