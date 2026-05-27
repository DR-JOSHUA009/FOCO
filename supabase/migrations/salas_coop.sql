-- ============================================
-- SALAS COOP — Database Migration (safe re-run)
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  canvas_state JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Room participants table
CREATE TABLE IF NOT EXISTS room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Usuario',
  join_order INT NOT NULL DEFAULT 1,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- 3. Saved rooms table (permanent snapshots)
CREATE TABLE IF NOT EXISTS saved_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_room_id UUID,
  name TEXT NOT NULL,
  canvas_state JSONB DEFAULT '{}'::jsonb,
  saved_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Saved room members (snapshot of who was in the room)
CREATE TABLE IF NOT EXISTS saved_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_room_id UUID NOT NULL REFERENCES saved_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Usuario'
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_room_members ENABLE ROW LEVEL SECURITY;

-- Rooms: anyone authenticated can read active rooms
CREATE POLICY "rooms_select" ON rooms
  FOR SELECT TO authenticated
  USING (true);

-- Rooms: only host can update/delete
CREATE POLICY "rooms_update" ON rooms
  FOR UPDATE TO authenticated
  USING (host_id = auth.uid());

CREATE POLICY "rooms_delete" ON rooms
  FOR DELETE TO authenticated
  USING (host_id = auth.uid());

-- Rooms: authenticated users can create
CREATE POLICY "rooms_insert" ON rooms
  FOR INSERT TO authenticated
  WITH CHECK (host_id = auth.uid());

-- Participants: anyone authenticated can read
CREATE POLICY "participants_select" ON room_participants
  FOR SELECT TO authenticated
  USING (true);

-- Participants: authenticated users can insert themselves
CREATE POLICY "participants_insert" ON room_participants
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Participants: user can delete own record, or host can delete via service role
CREATE POLICY "participants_delete" ON room_participants
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Saved rooms: users can see rooms they saved or were members of
CREATE POLICY "saved_rooms_select" ON saved_rooms
  FOR SELECT TO authenticated
  USING (
    saved_by = auth.uid()
    OR id IN (
      SELECT saved_room_id FROM saved_room_members WHERE user_id = auth.uid()
    )
  );

-- Saved rooms: authenticated can insert
CREATE POLICY "saved_rooms_insert" ON saved_rooms
  FOR INSERT TO authenticated
  WITH CHECK (saved_by = auth.uid());

-- Saved room members: can read if member
CREATE POLICY "saved_room_members_select" ON saved_room_members
  FOR SELECT TO authenticated
  USING (
    saved_room_id IN (
      SELECT id FROM saved_rooms WHERE saved_by = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- Saved room members: authenticated can insert
CREATE POLICY "saved_room_members_insert" ON saved_room_members
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================
-- REALTIME (enable for live collaboration)
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE saved_rooms;
