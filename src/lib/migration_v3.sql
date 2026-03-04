-- Add missing columns to generation_history table for recent feature additions
ALTER TABLE public.generation_history ADD COLUMN IF NOT EXISTS thumbnail_urls text[];
ALTER TABLE public.generation_history ADD COLUMN IF NOT EXISTS request_id text;
ALTER TABLE public.generation_history ADD COLUMN IF NOT EXISTS fal_endpoint text;
ALTER TABLE public.generation_history ADD COLUMN IF NOT EXISTS enhance_prompt_mode boolean;
ALTER TABLE public.generation_history ADD COLUMN IF NOT EXISTS input_image_url text;
ALTER TABLE public.generation_history ADD COLUMN IF NOT EXISTS base_prompt text;
ALTER TABLE public.generation_history ADD COLUMN IF NOT EXISTS negative_prompt text;
ALTER TABLE public.generation_history ADD COLUMN IF NOT EXISTS media_type text;
ALTER TABLE public.generation_history ADD COLUMN IF NOT EXISTS caption_type text;
ALTER TABLE public.generation_history ADD COLUMN IF NOT EXISTS tab text;
