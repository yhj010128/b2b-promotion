-- TeamBab 데이터베이스 스키마 (PostgreSQL 17)
-- 근거: docs/7-erd.md, docs/1-domain-definition.md(v1.4) 5장, docs/4-project-principle.md 3장(네이밍 원칙)
-- 추천 결과는 비영속이므로 테이블 없음. 설정/감사로그 테이블도 만들지 않음(오버엔지니어링 금지).

CREATE TABLE users (
    id                  SERIAL PRIMARY KEY,
    login_id            TEXT NOT NULL UNIQUE,
    password_hash       TEXT NOT NULL,                                  -- bcrypt 해시 (F0)
    name                TEXT NOT NULL,
    role                TEXT NOT NULL CHECK (role IN ('팀장', '팀원')),
    refresh_token_hash  TEXT
);

CREATE TABLE restaurants (
    id                      SERIAL PRIMARY KEY,
    name                    TEXT NOT NULL,
    last_visited_at         DATE,
    avg_satisfaction_score  NUMERIC(3, 2)
);

CREATE TABLE events (
    id                      SERIAL PRIMARY KEY,
    event_date              DATE NOT NULL,
    budget_per_person       INTEGER,
    headcount               INTEGER NOT NULL,
    status                  TEXT NOT NULL DEFAULT '모집중'
                            CHECK (status IN ('모집중', '확정', '종료')),
    confirmed_restaurant_id INTEGER REFERENCES restaurants(id)
);

CREATE TABLE preferences (
    id             SERIAL PRIMARY KEY,
    event_id       INTEGER NOT NULL REFERENCES events(id),
    user_id        INTEGER NOT NULL REFERENCES users(id),
    wanted_menu    TEXT,
    disliked_food  TEXT
);

CREATE TABLE reviews (
    id             SERIAL PRIMARY KEY,
    event_id       INTEGER NOT NULL REFERENCES events(id),
    user_id        INTEGER NOT NULL REFERENCES users(id),
    restaurant_id  INTEGER NOT NULL REFERENCES restaurants(id),
    rating         INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5), -- C4: 회식 종료 후에만 서비스 계층에서 INSERT 허용
    comment        TEXT
);

-- FK 컬럼 조회(추천 로직 C5, 확정 처리 등)용 최소 인덱스만 추가
CREATE INDEX idx_events_confirmed_restaurant_id ON events(confirmed_restaurant_id);
CREATE INDEX idx_preferences_event_id ON preferences(event_id);
CREATE INDEX idx_preferences_user_id ON preferences(user_id);
CREATE INDEX idx_reviews_event_id ON reviews(event_id);
CREATE INDEX idx_reviews_restaurant_id ON reviews(restaurant_id);
