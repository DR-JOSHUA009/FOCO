-- 1. CREATE ALL TABLES FIRST (WITHOUT POLICIES)

-- FRIENDS SYSTEM
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) 
    ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) 
    ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- COMPETITION GROUPS
CREATE TABLE IF NOT EXISTS competition_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  creator_id UUID NOT NULL REFERENCES auth.users(id)
    ON DELETE CASCADE,
  duration_months INTEGER NOT NULL
    CHECK (duration_months IN (3, 6, 12)),
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'active', 'finished')),
  started_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GROUP MEMBERS
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL 
    REFERENCES competition_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id)
    ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_points INTEGER NOT NULL DEFAULT 0,
  weeks_won INTEGER NOT NULL DEFAULT 0,
  UNIQUE(group_id, user_id)
);

-- GROUP VOTES
CREATE TABLE IF NOT EXISTS group_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL 
    REFERENCES competition_groups(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL
    CHECK (vote_type IN ('add_member', 'remove_member')),
  target_user_id UUID NOT NULL 
    REFERENCES auth.users(id) ON DELETE CASCADE,
  initiated_by UUID NOT NULL 
    REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closes_at TIMESTAMPTZ NOT NULL
);

-- GROUP VOTE RESPONSES
CREATE TABLE IF NOT EXISTS group_vote_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id UUID NOT NULL 
    REFERENCES group_votes(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL 
    REFERENCES auth.users(id) ON DELETE CASCADE,
  vote BOOLEAN NOT NULL,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vote_id, voter_id)
);

-- MISSIONS
CREATE TABLE IF NOT EXISTS group_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL 
    REFERENCES competition_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  week_number INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'lumos')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'voting', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PENDING MISSIONS
CREATE TABLE IF NOT EXISTS mission_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL 
    REFERENCES competition_groups(id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL 
    REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  suggested_due_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- EVIDENCE SUBMISSIONS
CREATE TABLE IF NOT EXISTS mission_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL 
    REFERENCES group_missions(id) ON DELETE CASCADE,
  group_id UUID NOT NULL 
    REFERENCES competition_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL 
    REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivery_points INTEGER NOT NULL DEFAULT 0,
  vote_points INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER GENERATED ALWAYS AS 
    (delivery_points + vote_points) STORED
);

-- EVIDENCE VOTES
CREATE TABLE IF NOT EXISTS evidence_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID NOT NULL 
    REFERENCES mission_evidence(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL 
    REFERENCES auth.users(id) ON DELETE CASCADE,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(evidence_id, voter_id)
);

-- WEEKLY RESULTS
CREATE TABLE IF NOT EXISTS weekly_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL 
    REFERENCES competition_groups(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  winner_id UUID NOT NULL 
    REFERENCES auth.users(id) ON DELETE CASCADE,
  winner_display_name TEXT NOT NULL,
  total_points INTEGER NOT NULL,
  consecutive_wins INTEGER NOT NULL DEFAULT 1,
  week_start TIMESTAMPTZ NOT NULL,
  week_end TIMESTAMPTZ NOT NULL,
  UNIQUE(group_id, week_number)
);

-- 2. ENABLE ROW LEVEL SECURITY

ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_vote_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_results ENABLE ROW LEVEL SECURITY;

-- 3. ADD POLICIES

-- FRIEND REQUESTS
DROP POLICY IF EXISTS "Users see their own requests" ON friend_requests;
CREATE POLICY "Users see their own requests"
  ON friend_requests FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users send requests" ON friend_requests;
CREATE POLICY "Users send requests"
  ON friend_requests FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Receiver updates status" ON friend_requests;
CREATE POLICY "Receiver updates status"
  ON friend_requests FOR UPDATE
  USING (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users delete own requests" ON friend_requests;
CREATE POLICY "Users delete own requests"
  ON friend_requests FOR DELETE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- COMPETITION GROUPS
DROP POLICY IF EXISTS "Members see their groups" ON competition_groups;
CREATE POLICY "Members see their groups"
  ON competition_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = competition_groups.id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users create groups" ON competition_groups;
CREATE POLICY "Authenticated users create groups"
  ON competition_groups FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creator updates group" ON competition_groups;
CREATE POLICY "Creator updates group"
  ON competition_groups FOR UPDATE
  USING (auth.uid() = creator_id);

-- GROUP MEMBERS
DROP POLICY IF EXISTS "Members see group members" ON group_members;
CREATE POLICY "Members see group members"
  ON group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Insert group members" ON group_members;
CREATE POLICY "Insert group members"
  ON group_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- GROUP VOTES
DROP POLICY IF EXISTS "Members see group votes" ON group_votes;
CREATE POLICY "Members see group votes"
  ON group_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_votes.group_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members create votes" ON group_votes;
CREATE POLICY "Members create votes"
  ON group_votes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_votes.group_id
      AND user_id = auth.uid()
    )
  );

-- GROUP VOTE RESPONSES
DROP POLICY IF EXISTS "Members see vote responses" ON group_vote_responses;
CREATE POLICY "Members see vote responses"
  ON group_vote_responses FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Members vote once" ON group_vote_responses;
CREATE POLICY "Members vote once"
  ON group_vote_responses FOR INSERT
  WITH CHECK (auth.uid() = voter_id);

-- MISSIONS
DROP POLICY IF EXISTS "Members see missions" ON group_missions;
CREATE POLICY "Members see missions"
  ON group_missions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_missions.group_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Creator manages missions" ON group_missions;
CREATE POLICY "Creator manages missions"
  ON group_missions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM competition_groups
      WHERE id = group_missions.group_id
      AND creator_id = auth.uid()
    )
  );

-- MISSION PROPOSALS
DROP POLICY IF EXISTS "Members see proposals" ON mission_proposals;
CREATE POLICY "Members see proposals"
  ON mission_proposals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = mission_proposals.group_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members propose missions" ON mission_proposals;
CREATE POLICY "Members propose missions"
  ON mission_proposals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = mission_proposals.group_id
      AND user_id = auth.uid()
    )
  );

-- EVIDENCE SUBMISSIONS
DROP POLICY IF EXISTS "Members see evidence" ON mission_evidence;
CREATE POLICY "Members see evidence"
  ON mission_evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = mission_evidence.group_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users submit own evidence" ON mission_evidence;
CREATE POLICY "Users submit own evidence"
  ON mission_evidence FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- EVIDENCE VOTES
DROP POLICY IF EXISTS "Members see evidence votes" ON evidence_votes;
CREATE POLICY "Members see evidence votes"
  ON evidence_votes FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Members vote on evidence" ON evidence_votes;
CREATE POLICY "Members vote on evidence"
  ON evidence_votes FOR INSERT
  WITH CHECK (auth.uid() = voter_id);

-- WEEKLY RESULTS
DROP POLICY IF EXISTS "Members see weekly results" ON weekly_results;
CREATE POLICY "Members see weekly results"
  ON weekly_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = weekly_results.group_id
      AND user_id = auth.uid()
    )
  );

-- 4. ADD REALTIME PUBLICATIONS
-- Ignore errors if tables are already in the publication
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE group_missions;
EXCEPTION WHEN OTHERS THEN END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE mission_evidence;
EXCEPTION WHEN OTHERS THEN END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE evidence_votes;
EXCEPTION WHEN OTHERS THEN END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE group_votes;
EXCEPTION WHEN OTHERS THEN END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE weekly_results;
EXCEPTION WHEN OTHERS THEN END $$;

-- 5. RELOAD SCHEMA
NOTIFY pgrst, 'reload schema';
