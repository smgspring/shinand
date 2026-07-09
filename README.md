# 신앤 F&B 홈페이지

신앤 F&B 회사 소개, 카페 창업/운영 컨설팅 상담, 공지사항/전자공고를 제공하는 정적 홈페이지입니다.

## 구조

- `public/`: Cloudflare Pages 배포 출력 디렉터리
- `content/notices/`: 공지 원문 Markdown
- `public/notices/`: 공지 상세 페이지와 PDF 원본
- `public/data/notices.json`: 홈페이지와 공지 목록에서 사용하는 공지 인덱스
- `evidence/`: 공고 게시 증빙 로그, 해시 기록, 배포 기록
- `scripts/`: 공고 해시/운영 요건 검증 스크립트

## 로컬 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:4173`으로 확인합니다.

## 검증

```bash
npm run hash:notices
npm run verify
```

## Cloudflare Pages 설정

- Framework preset: `None`
- Build command: 비움
- Build output directory: `public`
- Production branch: `main`

상세 연결 절차는 `docs/cloudflare-pages-setup.md`를 참고합니다.

## 도메인 운영

최종 도메인은 `www.shin-and.com`입니다.

1. Cloudflare에 `shin-and.com` 존을 추가합니다.
2. 도메인 등록기관의 네임서버를 Cloudflare 네임서버로 변경합니다.
3. Cloudflare Pages 프로젝트에서 Custom domain으로 `www.shin-and.com`을 연결합니다.
4. `main` 브랜치에 변경 사항을 push하면 Cloudflare Pages가 자동 배포합니다.

## 전자공고 운영 원칙

- 공고는 홈페이지 상단 메뉴와 메인 화면의 `공지사항·전자공고` 영역에서 쉽게 접근할 수 있어야 합니다.
- 공고 원문 PDF, 게시 시작/종료일, SHA-256 해시, Git 커밋, Cloudflare 배포 URL을 함께 보관합니다.
- 게시 기간이 끝난 공고도 삭제하지 않고 공지사항 아카이브와 상세 URL에서 계속 열람 가능하게 유지합니다.
- 정정이 필요한 경우 기존 파일을 덮어쓰지 않고 새 버전 파일과 새 로그를 추가합니다.
