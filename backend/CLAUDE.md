# b2b-promotion 백엔드 개발을 위한 지침

## 반드시 준수할 사항

- SOLID 원칙을 반드시 준수해
- Clean Architecture을 반드시 준수해

## 참조 문서 (docs/)

작업 전 관련 문서를 먼저 확인할 것. `docs/` 내 문서가 코드보다 우선하는 단일 진실 원천이며, 문서와 코드가 어긋나면 문서를 먼저 고친다.

| 파일 | 문서 이름 | 내용 |
|---|---|---|
| `docs/1-domain-definition.md` | TeamBab 도메인 정의서 | 문제 정의, 핵심 기능(F0~F2), 엔티티, 수용 기준(C1~C6) |
| `docs/2-PRD.md` | TeamBab PRD (제품 요구사항 문서) | 범위, 기능/비기능 요구사항, 기술 스택, 일정 |
| `docs/3-user-scenario.md` | TeamBab 사용자 시나리오 | 정상/예외 플로우 사용자 시나리오 |
| `docs/4-project-principle.md` | TeamBab 프로젝트 구조 설계 원칙 | 레이어, 네이밍, 테스트, 보안, 디렉토리 구조 |
| `docs/5-arch-diagram.md` | TeamBab 기술 아키텍처 다이어그램 | 기술 아키텍처 다이어그램 |
| `docs/7-erd.md` | TeamBab ERD | ERD |
| `docs/8-schema.sql` | TeamBab 데이터베이스 스키마 | PostgreSQL DDL |
| `docs/9-plan.md` | TeamBab 실행 계획 | DB/백엔드/프론트엔드 Task, 선행 관계, 완료 조건 체크리스트 |
| `docs/swagger.json` | TeamBab API | OpenAPI 스펙 |
