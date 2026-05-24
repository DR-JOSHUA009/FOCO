-- ============================================
-- FOCOI — Supabase Setup Script
-- Run this in your Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================

-- 1. xp_mutations table (for idempotent XP tracking)
CREATE TABLE IF NOT EXISTS public.xp_mutations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mutation_id text NOT NULL,
  action text NOT NULL,
  entity_id text NOT NULL,
  xp_earned integer NOT NULL DEFAULT 0,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, mutation_id)
);
ALTER TABLE public.xp_mutations ENABLE ROW LEVEL SECURITY;

-- 2. friend_requests table
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- 3. rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
  id text PRIMARY KEY,
  name text NOT NULL DEFAULT 'Sala de estudio',
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  canvas_state jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Add foreign key alias for the join in getActiveRooms
-- (profiles!rooms_host_id_fkey)
ALTER TABLE public.rooms
  DROP CONSTRAINT IF EXISTS rooms_host_id_fkey;
ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_host_id_fkey
  FOREIGN KEY (host_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. room_participants table
CREATE TABLE IF NOT EXISTS public.room_participants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id text NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(room_id, user_id)
);
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;

-- 5. notebook_file_records table
CREATE TABLE IF NOT EXISTS public.notebook_file_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notebook_id text NOT NULL,
  subject_id text,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL DEFAULT 0,
  transcription_status text NOT NULL DEFAULT 'pending' CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
  transcription_text text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.notebook_file_records ENABLE ROW LEVEL SECURITY;

-- 6. Storage Buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('notebook_files', 'notebook_files', true)
ON CONFLICT (id) DO NOTHING;

-- 7. Storage policies (allow authenticated uploads)
CREATE POLICY "Users can upload avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can read avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can update their avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload notebook files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'notebook_files');

CREATE POLICY "Users can read notebook files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'notebook_files');

SELECT 'All tables and buckets created successfully!' AS result;
