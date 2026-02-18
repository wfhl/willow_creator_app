-- Add missing columns to folders table
ALTER TABLE public.folders ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE public.folders ADD COLUMN IF NOT EXISTS icon text;

-- Add missing columns to presets table
ALTER TABLE public.presets ADD COLUMN IF NOT EXISTS tab text;

-- Add missing columns to generation_history table
ALTER TABLE public.generation_history ADD COLUMN IF NOT EXISTS with_audio boolean;
ALTER TABLE public.generation_history ADD COLUMN IF NOT EXISTS camera_fixed boolean;

-- Enhance assets table validation (optional but good practice)
-- Ensure storage_path is tracked if not already
-- ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS storage_path text; -- Already exists in schema v1
-- ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS public_url text;   -- Already exists in schema v1
