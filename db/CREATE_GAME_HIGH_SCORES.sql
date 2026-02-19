-- 게임별 개인 최고점 저장 테이블
CREATE TABLE IF NOT EXISTS game_high_scores (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  best_score INTEGER NOT NULL DEFAULT 0 CHECK (best_score >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_game_high_scores_user_id ON game_high_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_game_high_scores_game_id ON game_high_scores(game_id);

ALTER TABLE game_high_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own game scores" ON game_high_scores;
CREATE POLICY "Users can read their own game scores"
  ON game_high_scores FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own game scores" ON game_high_scores;
CREATE POLICY "Users can insert their own game scores"
  ON game_high_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own game scores" ON game_high_scores;
CREATE POLICY "Users can update their own game scores"
  ON game_high_scores FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
