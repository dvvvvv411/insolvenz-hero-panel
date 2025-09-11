-- Add insolventes_unternehmen column to nischen table
ALTER TABLE public.nischen 
ADD COLUMN insolventes_unternehmen TEXT;