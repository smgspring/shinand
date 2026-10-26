# 신앤 F&B 홈페이지

신앤 F&B 회사 소개, 카페 창업/운영 컨설팅 상담, 공지사항/전자공고를 제공하는 정적 홈페이지입니다.

## 구조

- `public/`: Cloudflare Pages 배포 출력 디렉터리 (정적 자산)
- `functions/api/contact.js`: 상담 신청 폼 처리용 Cloudflare Pages Function (Resend 발송)
- `content/notices/`: 공지 원문 Markdown
- `public/notices/`: 공지 상세 페이지와 PDF 원본
- `public/data/notices.json`: 홈페이지와 공지 목록에서 사용하는 공지 인덱스
- `evidence/`: 공고 게시 증빙 로그, 해시 기록, 배포 기록
- `scripts/`: 공고 해시/운영 요건 검증, 로컬 서버(`dev-server.mjs`), 장면 렌더링(`render-scenes.mjs`), 로고 생성(`build-logo.mjs`)
- `public/assets/js/liquid/`: 리퀴드 에셋(유리·클레이 3D) 모델과 렌더링 (Three.js)
  - `mark.js` 브랜드 마크(머그 + 반짝임) 윤곽. 3D 모델과 SVG 로고가 같은 윤곽을 씁니다
  - `kit.js` 유리·클레이 재질, 스튜디오 환경광, 형태 헬퍼
  - `assets.js` 히어로·챕터·서비스 아이콘·프로세스 배경·푸터 카드 장면과 렌더 목록(`RENDERS`)
  - `hero.js` 히어로 실행부 (느린 부유, 마우스에 따른 미세한 기울기)
- `public/assets/vendor/three/`: 빌드 없이 배포하기 위해 저장소에 포함한 three.js (`npm run vendor`로 갱신)
- `public/assets/images/scenes/`: 3D 장면에서 렌더링한 이미지 (WebP)

## 디자인

- 컨셉은 리퀴드 에셋입니다: 두꺼운 반투명 유리와 광택 클레이. 색은 기존 톤앤매너 — 깊은 숲 초록 `#14352b` · 크림 `#f2efe6` · 세이지 `#e5eadd` · 포인트 `#47776b`.
- 큰 색 면의 팔레트는 `public/assets/js/liquid/theme.js` 에서 정합니다. 히어로 · 푸터 카드는 밝은 세이지(D), 프로세스 섹션만 세이지 그린(B).
  후보 비교 이미지는 `COMPARE=1 OUT_DIR=/tmp/palette npm run render:scenes` 로 다시 뽑을 수 있습니다.
- 어두운 바탕 위의 유리는 `milkyGlass`(우윳빛 유리)를 써야 배경에 묻히지 않습니다. 밝은 바탕에서는 맑은 초록 유리를 씁니다.
- 푸터의 "by 오너브릿지"(`ownerbridge-endorser.svg`)는 오너브릿지 확정 로고(열린 아치교 · 남색 주력)의 엔도서 원본입니다. 색과 비율을 바꾸지 않습니다.
- 히어로는 실시간으로 그리고, WebGL이 없거나 로딩 전에는 `hero-poster.webp`가 보입니다.
- 챕터·서비스 아이콘·프로세스 배경·푸터 카드·공유 이미지(`og-image.png`)는 같은 재질로 만든 장면을 렌더링한 이미지입니다. 장면(`assets.js`)을 바꾼 뒤에는 `npm run render:scenes`로 다시 만들어 함께 커밋합니다.
- 로고는 `npm run build:logo`로 `logo-mark.svg`와 `favicon.svg`를 생성합니다.

## 로컬에서 확인하기

> `public/index.html` 파일을 더블클릭해 `file://`로 열면 CSS·스크립트·폰트가 모두 깨져 보입니다. 반드시 아래처럼 로컬 서버로 여세요.

처음 한 번만:

```bash
npm install
```

화면 확인 (기본):

```bash
npm run dev -- --open
```

브라우저에서 `http://localhost:4173`이 열립니다. 종료는 터미널에서 `Ctrl + C`. 포트를 바꾸려면 `PORT=5000 npm run dev`.
이 방식에서는 상담 폼 전송(`/api/contact`)만 동작하지 않습니다.

- 모바일 화면: Chrome 개발자도구(`Cmd + Option + I`) → 기기 툴바(`Cmd + Shift + M`)
- 3D 에셋을 고친 뒤 이미지 갱신: `npm run render:scenes` (Chrome 필요, 수 초 소요)

상담 신청 폼(`/api/contact`)까지 포함해 실제 배포 환경과 동일하게 확인할 때:

```bash
npm run dev:pages
```

브라우저에서 `http://localhost:8788`으로 확인합니다. 이메일 발송을 로컬에서 테스트하려면 프로젝트 루트에 (커밋하지 않는) `.dev.vars` 파일을 만들어 아래처럼 채웁니다.

```
RESEND_API_KEY="re_..."
CONTACT_TO_EMAIL="tlsalsruaaws@gmail.com"
CONTACT_FROM_EMAIL="no-reply@shin-and.com"
```

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

## 상담 신청 이메일 (Resend)

상담 신청 폼은 `/api/contact`(`functions/api/contact.js`, Cloudflare Pages Function)에서 [Resend](https://resend.com) API로 사업자 이메일에 발송됩니다. Pages Git 연동 배포는 저장소의 `functions/` 폴더를 자동으로 감지해 배포하므로 별도 빌드 설정이 필요 없습니다.

1. Resend 대시보드에서 발신 도메인(`shin-and.com`)을 추가하고 DNS 레코드(DKIM/SPF)로 인증합니다.
2. Resend 대시보드 → API Keys에서 API 키를 발급합니다.
3. Cloudflare 대시보드 → Workers & Pages → 해당 Pages 프로젝트 → **Settings → Environment variables**에서 다음 값을 등록합니다. (Production, 그리고 필요하면 Preview 환경에도 동일하게 추가)
   - `RESEND_API_KEY`: 발급받은 키 (Encrypt 체크)
   - `CONTACT_TO_EMAIL`: `tlsalsruaaws@gmail.com`
   - `CONTACT_FROM_EMAIL`: `no-reply@shin-and.com` (인증된 도메인 주소)
4. 환경 변수 저장 후 `main` 브랜치에 재배포(재푸시 또는 Pages 대시보드에서 "Retry deployment")하면 반영됩니다.

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
