# Cloudflare Pages 연결 가이드

## GitHub 저장소

- Repository: `https://github.com/smgspring/shinand`
- Production branch: `main`
- Build command: 비움
- Build output directory: `public`

## Pages 프로젝트 생성

1. Cloudflare Dashboard에서 `Workers & Pages`로 이동합니다.
2. `Create application` -> `Pages` -> `Connect to Git`를 선택합니다.
3. GitHub 저장소 `smgspring/shinand`를 연결합니다.
4. Framework preset은 `None`으로 둡니다.
5. Build command는 비워 두고, output directory는 `public`으로 입력합니다.
6. Production branch는 `main`으로 설정합니다.

## 도메인 연결

최종 도메인은 `www.shin-and.com`입니다.

1. Cloudflare에 `shin-and.com` DNS zone을 추가합니다.
2. 도메인 등록기관에서 네임서버를 Cloudflare가 안내한 네임서버로 변경합니다.
3. Pages 프로젝트의 `Custom domains`에서 `www.shin-and.com`을 추가합니다.
4. Cloudflare가 생성하는 CNAME 레코드를 확인합니다.
5. 필요하면 apex domain `shin-and.com`은 `www.shin-and.com`으로 Redirect Rule을 설정합니다.

## 공고 증빙 업데이트

배포가 완료되면 아래 파일을 업데이트합니다.

- `evidence/deployment-log.md`: Cloudflare deploy ID, deploy URL, 스크린샷 경로
- `evidence/notice-publication-log.csv`: 공고별 deploy ID와 deploy URL
- `evidence/screenshots/`: 초기 화면과 공고 상세 화면 스크린샷

공지 PDF를 변경하거나 정정 공고를 추가한 경우, 기존 파일을 덮어쓰지 말고 새 버전 파일을 추가한 뒤 실행합니다.

```bash
npm run hash:notices
npm run verify
```
