-- 骨架阶段只创建数据结构，真实用户注册和学习记录写入由后续模块完成。
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- owner_user_id 为空的词库是只读公共示例，不属于任何真实用户。
CREATE TABLE wordbooks (
    id INTEGER PRIMARY KEY,
    owner_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE words (
    id INTEGER PRIMARY KEY,
    wordbook_id INTEGER NOT NULL REFERENCES wordbooks(id) ON DELETE CASCADE,
    english TEXT NOT NULL COLLATE NOCASE,
    part_of_speech TEXT NOT NULL DEFAULT '',
    UNIQUE (wordbook_id, english)
);

CREATE TABLE word_meanings (
    id INTEGER PRIMARY KEY,
    word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
    meaning TEXT NOT NULL,
    UNIQUE (word_id, meaning)
);

CREATE TABLE study_sessions (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wordbook_id INTEGER REFERENCES wordbooks(id) ON DELETE SET NULL,
    mode TEXT NOT NULL CHECK (mode IN ('choice', 'spelling', 'meaning')),
    score INTEGER NOT NULL DEFAULT 0,
    total_count INTEGER NOT NULL DEFAULT 0 CHECK (total_count >= 0),
    correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
    started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TEXT
);

CREATE TABLE answer_records (
    id INTEGER PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
    word_id INTEGER REFERENCES words(id) ON DELETE SET NULL,
    submitted_answer TEXT NOT NULL,
    is_correct INTEGER NOT NULL CHECK (is_correct IN (0, 1)),
    is_first_attempt INTEGER NOT NULL CHECK (is_first_attempt IN (0, 1)),
    score_delta INTEGER NOT NULL CHECK (score_delta IN (-10, 0, 10)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wrong_words (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
    wrong_count INTEGER NOT NULL DEFAULT 1 CHECK (wrong_count >= 1),
    mastered INTEGER NOT NULL DEFAULT 0 CHECK (mastered IN (0, 1)),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, word_id)
);

CREATE TABLE checkins (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    checkin_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, checkin_date)
);

CREATE INDEX idx_wordbooks_owner ON wordbooks(owner_user_id);
CREATE INDEX idx_meanings_word ON word_meanings(word_id);
CREATE INDEX idx_sessions_user ON study_sessions(user_id);
CREATE INDEX idx_answers_session ON answer_records(session_id);
