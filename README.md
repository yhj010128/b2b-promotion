# TeamBab

팀 회식 메뉴/식당을 정하는 의사결정을 돕는 B2B 사내용 웹 앱입니다. 팀장이 회식 일정과 예산을 등록하면 팀원들이 선호 의견을 제출하고, 시스템이 예산·선호·과거 만족도를 반영해 식당을 추천합니다.

## 문서 (docs/)

개발 전 과정에서 작성/참조한 문서입니다. `docs/` 문서가 코드보다 우선하는 단일 진실 원천입니다.

| 문서 | 내용 |
|---|---|
| [1-domain-definition.md](docs/1-domain-definition.md) | 도메인 정의서 — 문제 정의, 핵심 기능(F0~F2), 엔티티, 수용 기준(C1~C6) |
| [2-PRD.md](docs/2-PRD.md) | PRD — 범위, 기능/비기능 요구사항, 기술 스택, 일정 |
| [3-user-scenario.md](docs/3-user-scenario.md) | 정상/예외 플로우 사용자 시나리오 |
| [4-project-principle.md](docs/4-project-principle.md) | 프로젝트 구조 설계 원칙 — 레이어, 네이밍, 테스트, 보안, 디렉토리 구조 |
| [5-arch-diagram.md](docs/5-arch-diagram.md) | 기술 아키텍처 다이어그램 |
| [6-wireframe.md](docs/6-wireframe.md) | 화면 와이어프레임 |
| [7-erd.md](docs/7-erd.md) | ERD |
| [8-schema.sql](docs/8-schema.sql) | PostgreSQL DDL |
| [9-plan.md](docs/9-plan.md) | 실행 계획 — DB/백엔드/프론트엔드 Task, 선행 관계, 완료 조건 체크리스트 |
| [swagger.json](docs/swagger.json) | OpenAPI 스펙 |

## Demo Site

- Frontend: https://cjfwai-0128-fe.vercel.app
- Backend API: https://cjfwai-0128-be.vercel.app (`GET /health`로 상태 확인, `/api-docs`는 프로덕션에서 비활성)

## 테스트용 사용자 계정

| 역할 | 아이디 | 비밀번호 |
|---|---|---|
| 팀장(관리자) | `leader01` | `password123` |
| 팀원(사용자) | `member01` | `password123` |

## 간략한 테스트 시나리오

1. `leader01`로 로그인 → 회식 일정 등록 (날짜, 1인당 예산 20,000원, 인원 4명)
2. 로그아웃 후 `member01`로 로그인 → 선호 의견(희망 메뉴/못 먹는 음식) 제출
3. 다시 `leader01`로 로그인 → 추천 결과 조회 → 후보 중 하나를 확정 (상태: 확정)
4. `leader01`로 회식 종료 처리 (상태: 종료)
5. `member01`로 로그인 → 만족도 평가(별점 1~5 + 한줄평) 제출

예외 케이스는 [3-user-scenario.md](docs/3-user-scenario.md)의 2~6장 참고 (예산 미입력 시 오류, 추천 0건 시 수동 확정, 팀원의 확정 시도 시 권한 오류, 종료 전 평가 시도 시 오류, 저평점/최근방문 식당의 낮은 우선순위 배치).

E2E 테스트 결과(스크린샷, 리포트)는 [test/e2e/](test/e2e/)에 있습니다.
