CREATE TABLE course_assessment_attempts (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),course_id TEXT NOT NULL REFERENCES courses(id),score REAL NOT NULL,question_count INTEGER NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX course_assessment_user ON course_assessment_attempts(user_id,course_id,created_at);
