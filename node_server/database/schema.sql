CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('coach', 'trainer', 'player') NOT NULL,
  position ENUM('OH', 'OPP', 'MB', 'S', 'L') NULL,
  jersey_number INT NULL,
  age INT NULL,
  birthdate DATE NULL,
  location VARCHAR(160) NULL,
  profile_picture_url VARCHAR(500) NULL,
  profile_picture_file_id VARCHAR(160) NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teams (
  id INT PRIMARY KEY AUTO_INCREMENT,
  team_name VARCHAR(100) NOT NULL,
  coach_id INT NOT NULL,
  team_color VARCHAR(50) NULL,
  logo_url VARCHAR(255) NULL,
  team_logo_file_id VARCHAR(160) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_teams_coach FOREIGN KEY (coach_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS team_members (
  id INT PRIMARY KEY AUTO_INCREMENT,
  team_id INT NOT NULL,
  player_id INT NOT NULL,
  joined_at DATE,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE KEY unique_team_player (team_id, player_id),
  CONSTRAINT fk_team_members_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_team_members_player FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS team_trainers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  team_id INT NOT NULL,
  trainer_id INT NOT NULL,
  assigned_by INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_team_trainer (team_id, trainer_id),
  CONSTRAINT fk_team_trainers_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_team_trainers_trainer FOREIGN KEY (trainer_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_team_trainers_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS coach_trainers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  coach_id INT NOT NULL,
  trainer_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_coach_trainer (coach_id, trainer_id),
  CONSTRAINT fk_coach_trainers_coach FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_coach_trainers_trainer FOREIGN KEY (trainer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS seasons (
  id INT PRIMARY KEY AUTO_INCREMENT,
  team_id INT NOT NULL,
  season_name VARCHAR(100) NOT NULL,
  season_type ENUM('pre-season', 'regular', 'tournament', 'off-season') DEFAULT 'regular',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_seasons_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS matches (
  id INT PRIMARY KEY AUTO_INCREMENT,
  team_id INT NOT NULL,
  opponent_name VARCHAR(100) NOT NULL,
  match_date DATE NOT NULL,
  best_of INT NOT NULL DEFAULT 1,
  is_home BOOLEAN DEFAULT TRUE,
  result ENUM('win', 'loss', 'draw') NULL,
  team_score INT NULL,
  opponent_score INT NULL,
  season_id INT NULL,
  match_type ENUM('friendly', 'league', 'tournament', 'playoff') DEFAULT 'friendly',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_matches_team FOREIGN KEY (team_id) REFERENCES teams(id),
  CONSTRAINT fk_matches_season FOREIGN KEY (season_id) REFERENCES seasons(id)
);

CREATE TABLE IF NOT EXISTS match_scores (
  id INT PRIMARY KEY AUTO_INCREMENT,
  match_id INT NOT NULL,
  match_number INT NOT NULL,
  team_score INT NULL,
  opponent_score INT NULL,
  result ENUM('win', 'loss', 'draw') NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_match_number_score (match_id, match_number),
  CONSTRAINT fk_match_scores_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS team_rankings (
  id INT PRIMARY KEY AUTO_INCREMENT,
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
  UNIQUE KEY unique_team_season (team_id, season_id),
  CONSTRAINT fk_team_rankings_team FOREIGN KEY (team_id) REFERENCES teams(id),
  CONSTRAINT fk_team_rankings_season FOREIGN KEY (season_id) REFERENCES seasons(id)
);

CREATE TABLE IF NOT EXISTS drills (
  id INT PRIMARY KEY AUTO_INCREMENT,
  drill_name VARCHAR(100) NOT NULL,
  category ENUM('spiking', 'serving', 'receiving', 'setting', 'blocking', 'defense', 'conditioning', 'jumping') NOT NULL,
  difficulty ENUM('beginner', 'intermediate', 'advanced', 'elite') NOT NULL,
  description TEXT,
  instructions TEXT,
  duration_minutes INT DEFAULT 30,
  target_metric VARCHAR(100) NULL,
  ideal_score DECIMAL(5,2) NULL,
  video_url VARCHAR(255) NULL,
  created_by INT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_drills_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS training_assignments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  player_id INT NOT NULL,
  assigned_by INT NOT NULL,
  drill_id INT NULL,
  focus_area VARCHAR(100) NOT NULL,
  drill_description TEXT,
  target_reps INT NULL,
  target_success_rate DECIMAL(5,2) NULL,
  due_date DATE,
  status ENUM('pending', 'in_progress', 'completed', 'overdue', 'cancelled') DEFAULT 'pending',
  completed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_training_assignments_player FOREIGN KEY (player_id) REFERENCES users(id),
  CONSTRAINT fk_training_assignments_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id),
  CONSTRAINT fk_training_assignments_drill FOREIGN KEY (drill_id) REFERENCES drills(id)
);

CREATE TABLE IF NOT EXISTS training_schedules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  team_id INT NOT NULL,
  session_type ENUM('match', 'training', 'conditioning') NOT NULL DEFAULT 'training',
  session_date DATE NOT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_training_schedules_team FOREIGN KEY (team_id) REFERENCES teams(id),
  CONSTRAINT fk_training_schedules_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS training_schedule_qr_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  training_schedule_id INT NOT NULL,
  token VARCHAR(96) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_training_schedule_qr_tokens_schedule FOREIGN KEY (training_schedule_id) REFERENCES training_schedules(id),
  CONSTRAINT fk_training_schedule_qr_tokens_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS drill_performance_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
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
      THEN (success_count / reps_completed) * 100
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
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  session_type ENUM('match', 'training', 'conditioning') NOT NULL,
  match_id INT NULL,
  match_number INT NOT NULL DEFAULT 1,
  season_id INT NULL,
  action_type ENUM('spike', 'serve', 'receive', 'dig', 'set', 'block', 'jump', 'run', 'reflection') NOT NULL,
  result ENUM('kill', 'error', 'ace', 'perfect', 'good', 'poor', 'assist', 'stuff', 'touch', 'normal') NULL,
  value DECIMAL(8,2) NULL,
  minutes_played INT DEFAULT 0,
  fatigue_level TINYINT CHECK (fatigue_level BETWEEN 1 AND 5),
  rpe TINYINT CHECK (rpe BETWEEN 1 AND 10),
  sleep_quality TINYINT CHECK (sleep_quality BETWEEN 1 AND 5) NULL,
  energy_level TINYINT CHECK (energy_level BETWEEN 1 AND 10) NULL,
  confidence_level TINYINT CHECK (confidence_level BETWEEN 1 AND 10) NULL,
  focus_level TINYINT CHECK (focus_level BETWEEN 1 AND 10) NULL,
  injury_status ENUM('none', 'minor', 'moderate', 'injured') DEFAULT 'none',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_performance_logs_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_performance_logs_match FOREIGN KEY (match_id) REFERENCES matches(id),
  CONSTRAINT fk_performance_logs_season FOREIGN KEY (season_id) REFERENCES seasons(id)
);

CREATE TABLE IF NOT EXISTS wellness_checkins (
  id INT PRIMARY KEY AUTO_INCREMENT,
  player_id INT NOT NULL,
  checkin_date DATE NOT NULL,
  fatigue_level TINYINT NOT NULL CHECK (fatigue_level BETWEEN 1 AND 10),
  rpe TINYINT NOT NULL CHECK (rpe BETWEEN 1 AND 10),
  sleep_hours DECIMAL(4,1) NOT NULL CHECK (sleep_hours BETWEEN 0 AND 24),
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_player_checkin_date (player_id, checkin_date),
  CONSTRAINT fk_wellness_checkins_player FOREIGN KEY (player_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS attendance_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  player_id INT NOT NULL,
  team_id INT NOT NULL,
  session_type ENUM('match', 'training', 'conditioning') NOT NULL,
  match_id INT NULL,
  session_date DATE NOT NULL,
  status ENUM('present', 'absent', 'late', 'excused') NOT NULL,
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
  id INT PRIMARY KEY AUTO_INCREMENT,
  player_id INT NOT NULL,
  injury_type VARCHAR(100) NOT NULL,
  body_part ENUM('ankle', 'knee', 'shoulder', 'back', 'wrist', 'elbow', 'hip', 'other') NOT NULL,
  severity ENUM('mild', 'moderate', 'severe') NOT NULL,
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
  id INT PRIMARY KEY AUTO_INCREMENT,
  coach_id INT NOT NULL,
  team_id INT NOT NULL,
  match_id INT NULL,
  match_date DATE NOT NULL,
  lineup_config JSON NOT NULL,
  rotation_order JSON NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lineups_coach FOREIGN KEY (coach_id) REFERENCES users(id),
  CONSTRAINT fk_lineups_team FOREIGN KEY (team_id) REFERENCES teams(id),
  CONSTRAINT fk_lineups_match FOREIGN KEY (match_id) REFERENCES matches(id)
);

CREATE TABLE IF NOT EXISTS player_comparisons (
  id INT PRIMARY KEY AUTO_INCREMENT,
  coach_id INT NOT NULL,
  team_id INT NOT NULL,
  season_id INT NOT NULL,
  metric_name VARCHAR(50) NOT NULL,
  rankings JSON NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_player_comparisons_coach FOREIGN KEY (coach_id) REFERENCES users(id),
  CONSTRAINT fk_player_comparisons_team FOREIGN KEY (team_id) REFERENCES teams(id),
  CONSTRAINT fk_player_comparisons_season FOREIGN KEY (season_id) REFERENCES seasons(id)
);
