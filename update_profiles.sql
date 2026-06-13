-- Fix: ensure display_name column exists in profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS display_name TEXT;

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS username TEXT;

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Populate display_name for all existing users
UPDATE profiles p
SET display_name = COALESCE(
  (SELECT raw_user_meta_data->>'display_name' 
   FROM auth.users WHERE id = p.id),
  (SELECT split_part(email, '@', 1) 
   FROM auth.users WHERE id = p.id)
)
WHERE display_name IS NULL;

-- Populate username for all existing users who don't have one
UPDATE profiles p
SET username = COALESCE(
  (SELECT raw_user_meta_data->>'username' 
   FROM auth.users WHERE id = p.id),
  (SELECT split_part(email, '@', 1) 
   FROM auth.users WHERE id = p.id)
)
WHERE username IS NULL;

NOTIFY pgrst, 'reload schema';
