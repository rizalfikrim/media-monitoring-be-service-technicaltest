CREATE TABLE mentions (
    id BIGSERIAL PRIMARY KEY,
    external_id TEXT,
    source TEXT NOT NULL,
    title TEXT,
    content TEXT,
    url TEXT,
    author TEXT,
    published_at TIMESTAMPTZ,
    engagement BIGINT,
    dedupe_key CHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mentions_source
    ON mentions (source);

CREATE INDEX idx_mentions_published_at
    ON mentions (published_at DESC);
