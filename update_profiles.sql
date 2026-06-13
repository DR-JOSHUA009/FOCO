-- ============================================
-- DIAGNÓSTICO: Ver qué tiene auth.users vs profiles
-- ============================================
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'display_name' as meta_display_name,
  u.raw_user_meta_data->>'full_name' as meta_full_name,
  p.display_name as profile_display_name,
  p.username as profile_username
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LIMIT 20;

-- ============================================
-- DIAGNÓSTICO: Ver grupos creados y sus miembros
-- ============================================
SELECT 
  cg.id,
  cg.name,
  cg.creator_id,
  cg.status,
  cg.created_at,
  gm.user_id as member_id
FROM competition_groups cg
LEFT JOIN group_members gm ON gm.group_id = cg.id
ORDER BY cg.created_at DESC
LIMIT 10;

-- ============================================
-- FIX: Poblar display_name y username para todos los usuarios existentes
-- ============================================
UPDATE profiles p
SET 
  display_name = COALESCE(
    p.display_name,
    (SELECT raw_user_meta_data->>'display_name' 
     FROM auth.users WHERE id = p.id),
    (SELECT raw_user_meta_data->>'full_name' 
     FROM auth.users WHERE id = p.id),
    (SELECT split_part(email, '@', 1) 
     FROM auth.users WHERE id = p.id)
  ),
  username = COALESCE(
    p.username,
    (SELECT raw_user_meta_data->>'username'
     FROM auth.users WHERE id = p.id),
    (SELECT split_part(email, '@', 1) 
     FROM auth.users WHERE id = p.id)
  )
WHERE p.display_name IS NULL 
   OR p.username IS NULL;

-- Confirmar el resultado
SELECT id, display_name, username FROM profiles LIMIT 20;

NOTIFY pgrst, 'reload schema';
