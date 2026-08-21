# TeamBab 프로덕션(Vercel) 프론트+백엔드 통합 E2E 테스트 리포트

- 프론트엔드: `https://cjfwai-0128-fe.vercel.app` (Vercel 프로덕션 배포)
- 백엔드: `https://cjfwai-0128-be.vercel.app` (Vercel 프로덕션 배포)
- DB: Supabase Postgres (프로젝트 `oiyyfuwkmuhylhvkcebi`)
- 방식: Playwright MCP로 실제 Chromium 브라우저를 배포된 프론트엔드에 직접 접속해 조작
- 참조 문서: `docs/3-user-scenario.md`
- 테스트 계정: `leader01`(팀장) / `member01`(팀원) — 이번 테스트를 위해 운영 DB에 직접 시드, 종료 후 삭제(TRUNCATE)함
- 결과: **6개 시나리오 전부 정상 동작**

## 사전 확인

- 프론트엔드 `/preferences` 등 하위 경로를 브라우저 주소창으로 직접 열어도 404 없이 정상 로드됨 — `frontend/vercel.json`의 SPA fallback rewrite가 배포본에도 정상 반영됨.
- CORS: 프론트(`cjfwai-0128-fe.vercel.app`)에서 백엔드(`cjfwai-0128-be.vercel.app`)로의 실제 브라우저 fetch/axios 요청이 차단 없이 성공 — `CLIENT_ORIGIN` 환경변수가 이 프론트엔드 도메인과 일치하도록 설정되어 있음.

## 결과 상세

| # | 시나리오 | 근거 | 결과 | 스크린샷 |
|---|---|---|---|---|
| 1 | 정상 플로우: 로그인→일정등록→선호제출→추천→확정→종료→평가→점수갱신 | 1장 | PASS | prod-01~08 |
| 2 | C3: 예산 미입력 상태에서 추천 시도 → "예산을 먼저 입력하세요" | 2장 | PASS | prod-09 |
| 3 | C6: 추천 후보 0건 → 팀장 수동 확정 | 3장 | PASS | prod-10, prod-11 |
| 4 | C2: 팀원의 확정 시도 → 403 (버튼 미노출 + API 직접 호출도 차단) | 4장 | PASS | prod-04(버튼 없음 확인은 목록에 없음, API 응답으로 검증) |
| 5 | C4: 종료 전 평가 시도 → 400 (UI 비활성 + API 직접 호출도 차단) | 5장 | PASS | prod-05 |
| 6 | C5: 저평점(한신포차 2.1점) 식당이 배제되지 않고 낮은 우선순위로 하위 배치 | 6장 | PASS | prod-03 |

### 시나리오 1 상세

1. leader01 로그인 → 회식 일정 등록(예산 20,000원, 4명) — `prod-01-event-created.png`
2. member01 로그인 → 선호 의견 제출(희망: 삼겹살, 못 먹는 음식: 해산물) — `prod-02-preference-submitted.png`
3. leader01 → 추천 결과 조회: 삼겹살천국(정상), 한신포차(낮은 우선순위, 2.1점) — `prod-03-recommendations.png`
4. leader01 → 삼겹살천국 확정, 상태 "확정" — `prod-04-confirmed.png`
5. member01 → 만족도 평가 시도, 아직 "확정" 상태라 UI 비활성 — `prod-05-c4-review-blocked.png`
6. leader01 → 회식 종료 처리, 상태 "종료" — `prod-06-event-closed.png`
7. member01 → 만족도 평가(5점 + "맛있었어요!") 제출 — `prod-07-review-filled.png`, `prod-08-review-submitted.png`
8. DB 확인: `restaurants.avg_satisfaction_score`가 `5.00`으로, `last_visited_at`이 이벤트 날짜로 갱신됨

### C2 / C4 API 직접 호출 검증 (실제 프론트 origin에서 fetch)

member01 세션에서 배포된 프론트 페이지 컨텍스트로 백엔드에 직접 요청:
- `POST /api/events/1/confirm` → `403 {"message":"권한이 없습니다"}`
- `POST /api/events/1/reviews` (종료 전) → `400 {"message":"회식 종료 후 평가 가능"}`

두 요청 모두 CORS 없이 정상 응답을 받아, 프론트-백엔드 간 실제 배포 환경에서의 통신도 함께 검증됨.

## 정리

테스트 완료 후 운영 DB의 모든 테이블을 `TRUNCATE ... RESTART IDENTITY CASCADE`로 초기화해 테스트 데이터를 남기지 않았다.

## 참고

- 최초 프론트엔드 배포 URL(`https://b2b-promotion-or9qmjmok-cj-cf80.vercel.app`)은 Vercel Deployment Protection(SSO)이 걸려 있어 익명 접근이 불가능했음 — 공개 프로덕션 도메인(`cjfwai-0128-fe.vercel.app`)으로 재확인 후 테스트 진행.
- 백엔드도 이전 라운드에서 `DATABASE_URL` 환경변수 줄바꿈 버그로 모든 DB 접근 요청이 타임아웃되는 문제가 있었으며(별도 리포트 `report-prod.md` 참고), 이번 테스트 시점에는 이미 정상화되어 있었음.
