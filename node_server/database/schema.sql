CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('coach', 'trainer', 'player')),
  position VARCHAR(10) NULL CHECK (position IS NULL OR position IN ('OH', 'OPP', 'MB', 'S', 'L')),
  jersey_number INT NULL,
  age INT NULL,
  birthdate DATE NULL,
  location VARCHAR(160) NULL,
  profile_picture_url VARCHAR(500) NULL,
  profile_picture_file_id VARCHAR(160) NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  team_name VARCHAR(100) NOT NULL,
  coach_id INT NOT NULL,
  team_color VARCHAR(50) NULL,
  logo_url VARCHAR(255) NULL,
  team_logo_file_id VARCHAR(160) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_teams_coach FOREIGN KEY (coach_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS team_members (
  id SERIAL PRIMARY KEY,
  team_id INT NOT NULL,
  player_id INT NOT NULL,
  joined_at DATE,
  is_active BOOLEAN DEFAULT true,
  CONSTRAINT unique_team_player UNIQUE (team_id, player_id),
  CONSTRAINT fk_team_members_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_team_members_player FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS team_trainers (
  id SERIAL PRIMARY KEY,
  team_id INT NOT NULL,
  trainer_id INT NOT NULL,
  assigned_by INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_team_trainer_team UNIQUE (team_id),
  CONSTRAINT unique_team_trainer UNIQUE (team_id, trainer_id),
  CONSTRAINT fk_team_trainers_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_team_trainers_trainer FOREIGN KEY (trainer_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_team_trainers_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS coach_trainers (
  id SERIAL PRIMARY KEY,
  coach_id INT NOT NULL,
  trainer_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_coach_trainer UNIQUE (coach_id, trainer_id),
  CONSTRAINT fk_coach_trainers_coach FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_coach_trainers_trainer FOREIGN KEY (trainer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS seasons (
  id SERIAL PRIMARY KEY,
  team_id INT NOT NULL,
  season_name VARCHAR(100) NOT NULL,
  season_type VARCHAR(30) DEFAULT 'regular' CHECK (season_type IN ('pre-season', 'regular', 'tournament', 'off-season')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_seasons_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  team_id INT NOT NULL,
  opponent_name VARCHAR(100) NOT NULL,
  match_date DATE NOT NULL,
  best_of INT NOT NULL DEFAULT 1,
  is_home BOOLEAN DEFAULT true,
  result VARCHAR(10) NULL CHECK (result IS NULL OR result IN ('win', 'loss', 'draw')),
  team_score INT NULL,
  opponent_score INT NULL,
  season_id INT NULL,
  match_type VARCHAR(20) DEFAULT 'friendly' CHECK (match_type IN ('friendly', 'league', 'tournament', 'playoff')),
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_matches_team FOREIGN KEY (team_id) REFERENCES teams(id),
  CONSTRAINT fk_matches_season FOREIGN KEY (season_id) REFERENCES seasons(id)
);

CREATE TABLE IF NOT EXISTS match_scores (
  id SERIAL PRIMARY KEY,
  match_id INT NOT NULL,
  match_number INT NOT NULL,
  team_score INT NULL,
  opponent_score INT NULL,
  result VARCHAR(10) NULL CHECK (result IS NULL OR result IN ('win', 'loss', 'draw')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_match_number_score UNIQUE (match_id, match_number),
  CONSTRAINT fk_match_scores_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS team_rankings (
  id SERIAL PRIMARY KEY,
  team_id INT NOT NULL,
  season_id INT NOT NULL,
  ranking_position INT NOT NULL,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  win_percentage DECIMAL(5,2) DEFAULT 0,
  points_for INT DEFAULT 0,
  points_against INT DEFAULT 0,
  point_difference INT DEFAULT 0,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_team_season UNIQUE (team_id, season_id),
  CONSTRAINT fk_team_rankings_team FOREIGN KEY (team_id) REFERENCES teams(id),
  CONSTRAINT fk_team_rankings_season FOREIGN KEY (season_id) REFERENCES seasons(id)
);

CREATE TABLE IF NOT EXISTS drills (
  id SERIAL PRIMARY KEY,
  drill_name VARCHAR(100) NOT NULL,
  category VARCHAR(30) NOT NULL CHECK (category IN ('spiking', 'serving', 'receiving', 'setting', 'blocking', 'defense', 'conditioning', 'jumping')),
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'elite')),
  description TEXT,
  instructions TEXT,
  duration_minutes INT DEFAULT 30,
  target_metric VARCHAR(100) NULL,
  ideal_score DECIMAL(5,2) NULL,
  video_url VARCHAR(255) NULL,
  created_by INT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_drills_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS training_assignments (
  id SERIAL PRIMARY KEY,
  player_id INT NOT NULL,
  assigned_by INT NOT NULL,
  drill_id INT NULL,
  focus_area VARCHAR(100) NOT NULL,
  drill_description TEXT,
  target_reps INT NULL,
  target_success_rate DECIMAL(5,2) NULL,
  due_date DATE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'cancelled')),
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_training_assignments_player FOREIGN KEY (player_id) REFERENCES users(id),
  CONSTRAINT fk_training_assignments_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id),
  CONSTRAINT fk_training_assignments_drill FOREIGN KEY (drill_id) REFERENCES drills(id)
);

CREATE TABLE IF NOT EXISTS training_schedules (
  id SERIAL PRIMARY KEY,
  team_id INT NOT NULL,
  session_type VARCHAR(20) NOT NULL DEFAULT 'training' CHECK (session_type IN ('match', 'training', 'conditioning')),
  session_date DATE NOT NULL,
  description TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_training_schedules_team FOREIGN KEY (team_id) REFERENCES teams(id),
  CONSTRAINT fk_training_schedules_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS training_schedule_qr_tokens (
  id SERIAL PRIMARY KEY,
  training_schedule_id INT NOT NULL,
  token VARCHAR(96) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_training_schedule_qr_tokens_schedule FOREIGN KEY (training_schedule_id) REFERENCES training_schedules(id),
  CONSTRAINT fk_training_schedule_qr_tokens_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS drill_performance_logs (
  id SERIAL PRIMARY KEY,
  training_assignment_id INT NOT NULL,
  player_id INT NOT NULL,
  drill_id INT NOT NULL,
  session_date DATE NOT NULL,
  reps_completed INT NULL,
  reps_target INT NULL,
  success_count INT NULL,
  failure_count INT NULL,
  success_rate DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN reps_completed > 0
      THEN (success_count / reps_completed::numeric) * 100
      ELSE NULL END
  ) STORED,
  metric_value DECIMAL(8,2) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_drill_logs_assignment FOREIGN KEY (training_assignment_id) REFERENCES training_assignments(id),
  CONSTRAINT fk_drill_logs_player FOREIGN KEY (player_id) REFERENCES users(id),
  CONSTRAINT fk_drill_logs_drill FOREIGN KEY (drill_id) REFERENCES drills(id)
);

CREATE TABLE IF NOT EXISTS performance_logs (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  session_type VARCHAR(20) NOT NULL CHECK (session_type IN ('match', 'training', 'conditioning')),
  match_id INT NULL,
  match_number INT NOT NULL DEFAULT 1,
  season_id INT NULL,
  action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('spike', 'serve', 'receive', 'dig', 'set', 'block', 'jump', 'run', 'reflection')),
  result VARCHAR(20) NULL CHECK (result IS NULL OR result IN ('kill', 'error', 'ace', 'perfect', 'good', 'poor', 'assist', 'stuff', 'touch', 'normal')),
  value DECIMAL(8,2) NULL,
  minutes_played INT DEFAULT 0,
  fatigue_level SMALLINT CHECK (fatigue_level BETWEEN 1 AND 5),
  rpe SMALLINT CHECK (rpe BETWEEN 1 AND 10),
  sleep_quality SMALLINT CHECK (sleep_quality BETWEEN 1 AND 5),
  energy_level SMALLINT CHECK (energy_level BETWEEN 1 AND 10),
  confidence_level SMALLINT CHECK (confidence_level BETWEEN 1 AND 10),
  focus_level SMALLINT CHECK (focus_level BETWEEN 1 AND 10),
  injury_status VARCHAR(20) DEFAULT 'none' CHECK (injury_status IN ('none', 'minor', 'moderate', 'injured')),
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_performance_logs_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_performance_logs_match FOREIGN KEY (match_id) REFERENCES matches(id),
  CONSTRAINT fk_performance_logs_season FOREIGN KEY (season_id) REFERENCES seasons(id)
);

CREATE TABLE IF NOT EXISTS wellness_checkins (
  id SERIAL PRIMARY KEY,
  player_id INT NOT NULL,
  checkin_date DATE NOT NULL,
  fatigue_level SMALLINT NOT NULL CHECK (fatigue_level BETWEEN 1 AND 10),
  rpe SMALLINT NOT NULL CHECK (rpe BETWEEN 1 AND 10),
  sleep_hours DECIMAL(4,1) NOT NULL CHECK (sleep_hours BETWEEN 0 AND 24),
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_player_checkin_date UNIQUE (player_id, checkin_date),
  CONSTRAINT fk_wellness_checkins_player FOREIGN KEY (player_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS attendance_logs (
  id SERIAL PRIMARY KEY,
  player_id INT NOT NULL,
  team_id INT NOT NULL,
  session_type VARCHAR(20) NOT NULL CHECK (session_type IN ('match', 'training', 'conditioning')),
  match_id INT NULL,
  session_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  late_minutes INT DEFAULT 0,
  reason TEXT NULL,
  marked_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_attendance_logs_player FOREIGN KEY (player_id) REFERENCES users(id),
  CONSTRAINT fk_attendance_logs_team FOREIGN KEY (team_id) REFERENCES teams(id),
  CONSTRAINT fk_attendance_logs_match FOREIGN KEY (match_id) REFERENCES matches(id),
  CONSTRAINT fk_attendance_logs_marked_by FOREIGN KEY (marked_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS injury_logs (
  id SERIAL PRIMARY KEY,
  player_id INT NOT NULL,
  injury_type VARCHAR(100) NOT NULL,
  body_part VARCHAR(20) NOT NULL CHECK (body_part IN ('ankle', 'knee', 'shoulder', 'back', 'wrist', 'elbow', 'hip', 'other')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe')),
  occurred_at DATE NOT NULL,
  recovered_at DATE NULL,
  days_missed INT NULL,
  reported_by INT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_injury_logs_player FOREIGN KEY (player_id) REFERENCES users(id),
  CONSTRAINT fk_injury_logs_reported_by FOREIGN KEY (reported_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS lineups (
  id SERIAL PRIMARY KEY,
  coach_id INT NOT NULL,
  team_id INT NOT NULL,
  match_id INT NULL,
  match_date DATE NOT NULL,
  lineup_config JSONB NOT NULL,
  rotation_order JSONB NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lineups_coach FOREIGN KEY (coach_id) REFERENCES users(id),
  CONSTRAINT fk_lineups_team FOREIGN KEY (team_id) REFERENCES teams(id),
  CONSTRAINT fk_lineups_match FOREIGN KEY (match_id) REFERENCES matches(id)
);

CREATE TABLE IF NOT EXISTS player_comparisons (
  id SERIAL PRIMARY KEY,
  coach_id INT NOT NULL,
  team_id INT NOT NULL,
  season_id INT NOT NULL,
  metric_name VARCHAR(50) NOT NULL,
  rankings JSONB NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_player_comparisons_coach FOREIGN KEY (coach_id) REFERENCES users(id),
  CONSTRAINT fk_player_comparisons_team FOREIGN KEY (team_id) REFERENCES teams(id),
  CONSTRAINT fk_player_comparisons_season FOREIGN KEY (season_id) REFERENCES seasons(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  recipient_user_id INT NOT NULL,
  actor_user_id INT NULL,
  type VARCHAR(80) NOT NULL,
  title VARCHAR(160) NOT NULL,
  body TEXT NULL,
  data JSONB NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_user_id) REFERENCES users(id),
  CONSTRAINT fk_notifications_actor FOREIGN KEY (actor_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON notifications (recipient_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read
  ON notifications (recipient_user_id, is_read);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  platform VARCHAR(40) NULL,
  push_token VARCHAR(255) NULL,
  endpoint VARCHAR(512) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_push_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT unique_push_endpoint UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON push_subscriptions (user_id, is_active);
