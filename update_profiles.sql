-- Add missing columns to profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS display_name TEXT;

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS username TEXT;

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Populate display_name from auth.users metadata
-- for existing users who already signed up
UPDATE profiles p
SET display_name = COALESCE(
  (SELECT raw_user_meta_data->>'display_name' 
   FROM auth.users WHERE id = p.id),
  (SELECT email FROM auth.users WHERE id = p.id)
)
WHERE display_name IS NULL;

NOTIFY pgrst, 'reload schema';
