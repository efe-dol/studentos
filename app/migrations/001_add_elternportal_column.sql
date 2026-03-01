-- Migration: Add elternportal_credentials column to profiles
-- Date: 2026-03-01

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS elternportal_credentials TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_elternportal ON public.profiles(id) WHERE elternportal_credentials IS NOT NULL;

-- Update RLS policy to allow users to update their own credentials
-- (Already covered by existing "Users can update their own profile" policy)
