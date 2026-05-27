-- ============================================
-- SALAS COOP — Database Migration (safe re-run)
-- Run this in your Supabase SQL Editor
-- ============================================

-- Drop and recreate rooms table correctly from scratch
DROP TABLE IF EXISTS room_participants CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;

CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  host_id UUID NOT NULL REFERENCES auth.users(id) 
    ON DELETE CASCADE,
  canvas_state JSONB,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active rooms"
  ON rooms FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users create rooms"
  ON rooms FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host can update room"
  ON rooms FOR UPDATE
  USING (auth.uid() = host_id);

CREATE POLICY "Host can delete room"
  ON rooms FOR DELETE
  USING (auth.uid() = host_id);

CREATE TABLE room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) 
    ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) 
    ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  join_order INTEGER NOT NULL,
  UNIQUE(room_id, user_id)
);

ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated sees participants"
  ON room_participants FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users join rooms"
  ON room_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users leave rooms"
  ON room_participants FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION transfer_host()
RETURNS TRIGGER AS $$
DECLARE
  next_host UUID;
BEGIN
  IF OLD.user_id = (
    SELECT host_id FROM rooms WHERE id = OLD.room_id
  ) THEN
    SELECT user_id INTO next_host
    FROM room_participants
    WHERE room_id = OLD.room_id
      AND user_id != OLD.user_id
    ORDER BY join_order ASC
    LIMIT 1;

    IF next_host IS NOT NULL THEN
      UPDATE rooms SET host_id = next_host
      WHERE id = OLD.room_id;
    ELSE
      UPDATE rooms SET status = 'closed'
      WHERE id = OLD.room_id;
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_participant_leave 
  ON room_participants;
CREATE TRIGGER on_participant_leave
  AFTER DELETE ON room_participants
  FOR EACH ROW EXECUTE FUNCTION transfer_host();

ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_participants;

NOTIFY pgrst, 'reload schema';
