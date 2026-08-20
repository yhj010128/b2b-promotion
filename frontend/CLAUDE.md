# b2b-promotion 프론트엔드 앱 개발을 위한 지침

## 기술 스택 (docs/2-PRD.md 5장 기준)

- **프레임워크**: React 19
- **플랫폼**: 웹 우선. 반응형 UI로 모바일 브라우저 대응 (별도 모바일 전용 앱 없음)
- **접근성**: 이번 범위에서 고려하지 않음
- **인증 연동**: 백엔드가 JWT access token(단기 만료) + refresh token(장기 만료) 방식을 사용하므로, 프론트는 access token을 `Authorization: Bearer` 헤더로 전달하고 만료 시 자동으로 refresh 요청 후 원 요청을 재시도한다 (PRD 6장)
- **연동 범위**: Google Calendar, Slack 등 외부 서비스 연동은 이번 범위에 없음 — 관련 UI/설정 화면을 만들지 않는다

## 참조 문서

- `docs/2-PRD.md` — 범위, 기능/비기능 요구사항, 기술 스택, 일정
- `docs/4-project-principle.md` 2장/3장/6장 — 프론트엔드 레이어 원칙(pages → components → api/hooks), 네이밍, 디렉토리 구조
