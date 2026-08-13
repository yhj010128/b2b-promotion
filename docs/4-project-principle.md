# TeamBab 프로젝트 구조 설계 원칙

| 버전 | 날짜 | 변경 내용 |
|---|---|---|
| 1.0 | 2026-08-13 | 최초 작성 (도메인 정의서 v1.3, PRD v1.1, 사용자 시나리오 기반) |

> 본 문서는 `1-domain-definition.md`(도메인 정의서 v1.3), `2-PRD.md`(PRD v1.1), `3-user-scenario.md`를 기반으로, 5일/1인 개발 규모의 MVP에 맞는 실용적 구조 원칙만 정의한다. 이 규모를 넘어서는 레이어링·추상화·조직 규칙은 다루지 않는다.

## 1. 최상위 원칙

1. **YAGNI** — 지금 필요한 것만 만든다. Google Calendar/Slack 연동, 관리자 콘솔, 팀 관리, 통계 대시보드 등 PRD 3장의 Out-of-Scope는 코드베이스에 자리조차 만들지 않는다(빈 폴더, 미사용 인터페이스 금지).
2. **도메인 문서가 단일 진실 원천** — 엔티티명·상태값·수용 기준(C1~C6)은 도메인 정의서 5~7장 표현을 코드에 그대로 반영한다(예: 회식 일정 상태는 `모집중/확정/종료` 그대로, 임의로 `pending/active` 등으로 재정의하지 않음). 문서와 코드가 어긋나면 문서를 먼저 고친다.
3. **추천 결과는 비영속** — 도메인 정의서 5장 · PRD 6장의 결정대로 추천 결과 테이블을 만들지 않는다. 추천은 매 요청 시 SQL + 애플리케이션 코드로 동기 계산해 응답으로만 반환한다.
4. **레이어는 최소 3단** — 오버엔지니어링 금지 원칙에 따라 클린 아키텍처/DDD식 계층(도메인 레이어, 유스케이스 레이어, 리포지토리 인터페이스 등)을 도입하지 않는다. 백엔드는 route → service → db 3단만 둔다.
5. **수용 기준(C1~C6) 우선 구현** — 기능을 추가로 다듬기보다 C1~C6을 통과시키는 것을 최우선으로 한다. 5일 일정상 버퍼가 없으므로(PRD 8장), 우선순위가 낮은 편의 기능보다 수용 기준 충족을 항상 먼저 완료한다.

## 2. 의존성/레이어 원칙

### 백엔드 (Node.js + Express)

```
route → service → db
```

- **route**: HTTP 요청/응답 처리, 인증 미들웨어 통과, 입력 파싱, service 호출, 응답 포맷팅만 담당. 비즈니스 로직(추천 계산, 가중치 판단 등)을 route에 두지 않는다.
- **service**: 도메인 로직(추천 계산, C5 가중치 정렬, 확정 권한 판단 등)을 담당. HTTP(req/res)를 알지 못한다 — Express 객체를 service에 넘기지 않는다.
- **db**: SQL 실행만 담당(`pg` 쿼리 함수 모음). service가 db 함수를 호출하는 방향만 허용하고 반대 방향 의존은 금지.
- **순환 의존 금지**: service끼리 서로 호출해야 한다면(예: 확정 시 만족도 점수 갱신 로직 참조) 공통 로직은 하나의 service 파일로 합치거나 별도 유틸 함수로 뺀다. 3단 외에 `repository`, `usecase`, `domain` 등 이름의 레이어를 별도로 만들지 않는다.

### 프론트엔드 (React 19)

```
pages(화면) → components(재사용 UI) → api(서버 호출) / hooks(상태)
```

- **pages**: 라우트 단위 화면(예: 로그인 화면, 추천 결과 화면). 여러 컴포넌트를 조합하고 데이터를 불러온다.
- **components**: 특정 페이지에 종속되지 않는 재사용 UI(별점 입력, 후보 카드 등). components는 pages를 import하지 않는다(역방향 의존 금지).
- **api**: `fetch` 호출을 모아둔 함수(예: `recommendApi.ts`). 컴포넌트가 axios/fetch를 직접 호출하지 않고 반드시 api 모듈을 거친다.
- Redux 등 전역 상태 관리 라이브러리, 별도 상태관리 레이어는 도입하지 않는다 — React 기본 state/context로 충분한 규모다.

## 3. 코드/네이밍 원칙

- **파일명**: 백엔드는 `기능명.역할.js` 패턴(예: `recommend.route.js`, `recommend.service.js`, `recommend.db.js`). 프론트엔드 컴포넌트는 PascalCase(`RecommendList.tsx`), 훅/유틸은 camelCase(`useAuth.ts`).
- **변수/함수명**: 도메인 용어를 영어 코드명으로 일관 매핑한다.
  - 회식 일정 → `event` (테이블: `events`)
  - 선호 의견 → `preference` (테이블: `preferences`)
  - 만족도 평가 → `review` (테이블: `reviews`)
  - 식당 → `restaurant` (테이블: `restaurants`)
  - 사용자 → `user` (테이블: `users`)
  - 상태값은 DB에 한국어 그대로 저장하거나(`모집중`/`확정`/`종료`) 문서와 매핑표를 명확히 유지한다. 매핑표 없이 임의 영문 상수(`OPEN`, `ACTIVE`)로 바꾸지 않는다.
- **API 엔드포인트**: REST 자원 기준 `/api/<복수형-자원>` + 필요시 하위 액션.
  - `POST /api/auth/login`, `POST /api/auth/refresh`
  - `POST /api/events` (회식 일정 등록), `GET /api/events/:id`
  - `POST /api/events/:id/preferences` (선호 의견 제출)
  - `GET /api/events/:id/recommendations` (추천 결과 조회, 비영속 — 매 호출 시 계산)
  - `POST /api/events/:id/confirm` (식당 확정, C2/C6)
  - `POST /api/events/:id/reviews` (만족도 평가 입력, C4)
- **커밋 시점 예외 처리 메시지는 도메인 정의서 문구를 그대로 사용**(예: `"예산을 먼저 입력하세요"`, `"조건에 맞는 추천 결과가 없습니다"`, `"회식 종료 후 평가 가능"`) — 별도 번역/재작성 금지.

## 4. 테스트/품질 원칙

5일/1인 개발 규모이므로 커버리지 목표를 잡지 않고, C1~C6 수용 기준과 핵심 로직(F1 추천, C5 가중치)에만 집중한다.

- **필수 테스트 대상**
  - 추천 로직 service 함수(C5 가중치 정렬, C6 0건 예외, C3 예산 미입력 예외) — 단위 테스트로 검증. 이 프로젝트에서 로직이 가장 복잡한 지점이므로 우선순위 1위.
  - 만족도 점수 갱신 로직(식당 단위 누적 평균 계산) — 단위 테스트.
  - C1(인증), C2(확정 권한), C4(종료 상태 확인) — 각 API에 대한 최소 통합 테스트 1개씩(정상 1건 + 예외 1건 수준).
- **불필요한 테스트**: UI 컴포넌트 스냅샷 테스트, E2E 자동화 프레임워크(Playwright/Cypress) 도입, 커버리지 리포트 도구 설정은 이번 범위에서 하지 않는다. Day 5 통합 테스트(PRD 7장)는 C1~C6을 수동/스크립트로 직접 확인하는 수준으로 충분하다.
- 테스트 프레임워크는 백엔드는 Node 내장 test runner(`node:test`) 또는 Jest 중 익숙한 것 하나만 선택하고, 별도 테스트 아키텍처(mock 서버, 픽스처 팩토리 등)를 구축하지 않는다.

## 5. 설정/보안/운영 원칙

- **환경변수**: `.env` 파일 1개로 관리(`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES`(예: 15m), `JWT_REFRESH_EXPIRES`(예: 14d), `RECOMMEND_MIN_SCORE`(C5 기준 점수, 기본 2.5), `RECOMMEND_RECENT_VISIT_COUNT`(C5 기준 방문 횟수, 기본 3)). `.env`는 `.gitignore`에 포함하고 `.env.example`만 커밋한다.
- **JWT 토큰 처리** (PRD 6장 기준)
  - access token: 로그인 성공 시 발급, 역할(팀장/팀원) 클레임 포함, 요청마다 `Authorization: Bearer <token>` 헤더로 검증(인증 미들웨어, C1).
  - refresh token: `users` 테이블에 해시(bcrypt 등)로 저장, `/api/auth/refresh` 전용 — access token 재발급에만 사용.
  - 재발급/로그아웃 시 refresh token 회전(rotation)까지만 구현. 블랙리스트, 다중 세션 관리, 디바이스별 세션 추적은 PRD 6장대로 이번 범위에서 만들지 않는다.
- **C5 임계값**: 팀장용 설정 화면이나 별도 설정 테이블을 만들지 않고 환경변수 상수로만 관리(PRD 6장 결정 그대로).
- **비밀번호/시크릿**: 비밀번호는 bcrypt 해시 저장, JWT 시크릿은 환경변수로만 관리하고 코드/레포에 하드코딩하지 않는다.
- **배포/운영**: 별도 CI/CD 파이프라인, 컨테이너 오케스트레이션(K8s 등) 구축은 이번 범위에서 하지 않는다. 단일 Express 서버 + PostgreSQL 인스턴스로 충분하며, 상태 비저장(stateless) API 구조만 지킨다(PRD 5장).

## 6. 디렉토리 구조

### 백엔드 (`server/`)

```
server/
├── src/
│   ├── routes/
│   │   ├── auth.route.js          # F0: login, refresh
│   │   ├── events.route.js        # 회식 일정/예산 등록
│   │   ├── preferences.route.js   # F1: 선호 의견 제출
│   │   ├── recommendations.route.js # F1: 추천 결과 조회 (비영속)
│   │   ├── confirm.route.js       # F1: 식당 확정 (C2, C6)
│   │   └── reviews.route.js       # F2: 만족도 평가 입력 (C4)
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── event.service.js
│   │   ├── preference.service.js
│   │   ├── recommend.service.js   # 추천 계산 로직 (C3, C5, C6 핵심)
│   │   ├── confirm.service.js     # 확정 권한/처리 로직 (C2)
│   │   └── review.service.js      # 만족도 평가 저장 + 식당 평균 갱신 (C4)
│   ├── db/
│   │   ├── pool.js                # pg Pool 인스턴스
│   │   ├── users.db.js
│   │   ├── events.db.js
│   │   ├── preferences.db.js
│   │   ├── reviews.db.js
│   │   └── restaurants.db.js
│   ├── middleware/
│   │   └── auth.middleware.js     # JWT 검증 (C1)
│   └── app.js                     # Express 앱 초기화
├── migrations/
│   └── 001_init.sql                # users, events, preferences, reviews, restaurants
├── tests/
│   ├── recommend.service.test.js  # C3, C5, C6
│   └── review.service.test.js
├── .env.example
└── package.json
```

### 프론트엔드 (`client/`)

```
client/
├── src/
│   ├── pages/
│   │   ├── LoginPage.tsx           # F0
│   │   ├── EventFormPage.tsx       # 회식 일정/예산 등록
│   │   ├── PreferenceFormPage.tsx  # F1: 선호 의견 제출
│   │   ├── RecommendationPage.tsx  # F1: 추천 결과 조회/확정 (C2, C6)
│   │   └── ReviewFormPage.tsx      # F2: 만족도 평가 입력 (C4)
│   ├── components/
│   │   ├── RestaurantCard.tsx      # 추천 후보 카드
│   │   ├── StarRating.tsx          # 별점 입력/표시
│   │   └── ProtectedRoute.tsx      # 인증 여부에 따른 라우트 가드
│   ├── api/
│   │   ├── authApi.ts
│   │   ├── eventApi.ts
│   │   ├── preferenceApi.ts
│   │   ├── recommendationApi.ts
│   │   └── reviewApi.ts
│   ├── hooks/
│   │   └── useAuth.ts              # access/refresh token 관리
│   └── App.tsx
└── package.json
```
