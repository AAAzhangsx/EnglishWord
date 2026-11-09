-- 骨架阶段创建八张表，仅公共示例词库已实际写入，账号与学习记录写入待开发。
-- SQLite 不支持列级 COMMENT，使用行尾中文注释说明字段，详细关系见 docs/DATABASE.md。
-- 这里只补注释，不改变版本 1 的表结构，已有数据库不需要重建。
-- 用户表：账号信息。业务中的“当前用户”未来从登录会话读取。
CREATE TABLE users (
    id INTEGER PRIMARY KEY,                            -- 用户编号，自动生成
    username TEXT NOT NULL UNIQUE,                     -- 登录用户名，不允许重复
    password_hash TEXT NOT NULL,                       -- 密码哈希验证串，不能保存明文密码
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP -- 注册时间，SQLite 默认按 UTC 记录
);

-- owner_user_id 为空的词库是只读公共示例，不属于任何真实用户。
CREATE TABLE wordbooks (
    id INTEGER PRIMARY KEY,                            -- 词库编号
    owner_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- 所属用户编号，NULL 表示公共示例
    name TEXT NOT NULL,                                 -- 词库名称，例如“大学英语四级”
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP -- 词库创建时间，UTC
);

-- 单词表：同一词库内英文不重复，不同词库可以收录同一个单词。
CREATE TABLE words (
    id INTEGER PRIMARY KEY,                            -- 单词编号
    wordbook_id INTEGER NOT NULL REFERENCES wordbooks(id) ON DELETE CASCADE, -- 所属词库编号
    english TEXT NOT NULL COLLATE NOCASE,               -- 英文拼写，唯一性比较忽略 ASCII 大小写
    part_of_speech TEXT NOT NULL DEFAULT '',             -- 词性，例如 n.、v.、adj.
    UNIQUE (wordbook_id, english)
);

-- 释义表：一个单词对应多条释义，补充释义时无需复制整条单词记录。
CREATE TABLE word_meanings (
    id INTEGER PRIMARY KEY,                            -- 释义编号
    word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE, -- 所属单词编号
    meaning TEXT NOT NULL,                             -- 一条中文释义，例如“书籍”
    UNIQUE (word_id, meaning)
);

-- 背诵轮次表：一轮一个汇总记录，背多轮则保存多条，历史写入待开发。
CREATE TABLE study_sessions (
    id INTEGER PRIMARY KEY,                            -- 本轮背诵记录编号，不是浏览器 Cookie 会话编号
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- 作答用户编号
    wordbook_id INTEGER REFERENCES wordbooks(id) ON DELETE SET NULL, -- 来源词库，删除词库后置空以保留成绩
    mode TEXT NOT NULL CHECK (mode IN ('choice', 'spelling', 'meaning')), -- 选择题、拼写、中文释义题，第三种待实现
    score INTEGER NOT NULL DEFAULT 0,                  -- 本轮累计分数，允许负分
    total_count INTEGER NOT NULL DEFAULT 0 CHECK (total_count >= 0), -- 本轮总题数
    correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0), -- 首次作答正确题数，不含重试答对
    started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 本轮开始时间，UTC
    finished_at TEXT                                   -- 本轮完成时间，UTC，未完成时为 NULL
);

-- 作答明细表：每次提交一条记录，用于解释计分和计算统计，写入待开发。
CREATE TABLE answer_records (
    id INTEGER PRIMARY KEY,                            -- 本次提交记录编号
    session_id INTEGER NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE, -- 所属背诵轮次编号
    word_id INTEGER REFERENCES words(id) ON DELETE SET NULL, -- 对应单词，删除单词后置空保留提交记录
    submitted_answer TEXT NOT NULL,                     -- 用户提交的答案文本
    is_correct INTEGER NOT NULL CHECK (is_correct IN (0, 1)), -- 本次是否答对，1 是、0 否
    is_first_attempt INTEGER NOT NULL CHECK (is_first_attempt IN (0, 1)), -- 是否本轮本题的首次提交，1 是、0 否
    score_delta INTEGER NOT NULL CHECK (score_delta IN (-10, 0, 10)), -- 此次分数变化，首次对 +10、首次错 -10、重试 0
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP -- 提交时间，UTC
);

-- 用户错题表：每个用户的每个单词最多一条，可跨轮次保留，写入待开发。
CREATE TABLE wrong_words (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- 错题所属用户编号
    word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE, -- 答错的单词编号
    wrong_count INTEGER NOT NULL DEFAULT 1 CHECK (wrong_count >= 1), -- 累计首次答错的轮次数，重试不重复累加
    mastered INTEGER NOT NULL DEFAULT 0 CHECK (mastered IN (0, 1)), -- 是否已掌握，1 是、0 否，判定策略待实现
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 最近更新错题状态的时间，UTC
    PRIMARY KEY (user_id, word_id)
);

-- 打卡表：用“用户 + 日期”联合主键保证同一天重复打卡不重复累计，写入待开发。
CREATE TABLE checkins (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- 打卡用户编号
    checkin_date TEXT NOT NULL,                         -- 业务日期 YYYY-MM-DD，计划按 Asia/Shanghai 生成
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 实际提交时间，UTC，与打卡日期含义不同
    PRIMARY KEY (user_id, checkin_date)
);

-- 常用查询索引：按用户找词库、按单词找释义、按用户找成绩、按轮次找明细。
CREATE INDEX idx_wordbooks_owner ON wordbooks(owner_user_id);
CREATE INDEX idx_meanings_word ON word_meanings(word_id);
CREATE INDEX idx_sessions_user ON study_sessions(user_id);
CREATE INDEX idx_answers_session ON answer_records(session_id);
