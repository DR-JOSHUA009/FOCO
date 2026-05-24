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

-- ==========================================
-- NOTEBOOK FILES STORAGE (Archivos Tab)
-- ==========================================
CREATE TABLE public.notebook_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notebook_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY ""Users see own files"" ON public.notebook_files FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY ""Users insert own files"" ON public.notebook_files FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ""Users delete own files"" ON public.notebook_files FOR DELETE USING (auth.uid() = user_id);


-- ==========================================
-- PROFILES TABLE & AUTH TRIGGER
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY ""Users read own profile"" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY ""Users update own profile"" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY ""Public profiles readable"" ON public.profiles FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $body
BEGIN
  INSERT INTO public.profiles (id, username, display_name, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$body LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

