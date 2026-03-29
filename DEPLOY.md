# curatio 배포 가이드

기본 배포 대상은 `Vercel`입니다. 현재 프로젝트는 `Next.js App Router` 구조이고, `vercel.json`에 주간 digest용 cron도 이미 연결되어 있습니다.

## 1. 배포 전에 준비할 것

- Firebase 프로젝트
- Vercel 프로젝트
- 필요하면 Resend
- 필요하면 OpenAI API Key

## 2. 환경변수

배포 환경에는 아래 값을 넣어야 합니다.

필수:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

선택:

- `OPENAI_API_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `CRON_SECRET`

기능 노출 제어:

- `NEXT_PUBLIC_ENABLE_FOLLOWS`
- `NEXT_PUBLIC_ENABLE_SUBSCRIPTIONS`
- `NEXT_PUBLIC_ENABLE_UPDATES`
- `NEXT_PUBLIC_ENABLE_ANALYTICS`
- `NEXT_PUBLIC_ENABLE_AI_SUMMARY`

로컬 템플릿은 [.env.example](/c:/★_VIBE%20CODING/1%20%20개발%20단계/외부_%2305_26-03_콘텐츠%20큐레이션%20서비스/curatio/.env.example) 를 사용하면 됩니다.

## 3. Firebase 설정

1. Firebase Console에서 웹 앱을 만든 뒤 웹 SDK 값을 복사합니다.
2. Authentication에서 `Google` 로그인을 켭니다.
3. Authentication의 `Authorized domains`에 실제 배포 도메인을 추가합니다.
   예: `your-project.vercel.app`, 커스텀 도메인
4. Firestore를 활성화합니다.

## 4. Vercel 배포

1. GitHub에 빈 저장소를 만듭니다.
   권장값:
   - owner: `pcwin21-alt`
   - repository name: `curatio`
   - branch: `main`
2. 로컬에서 아래 명령으로 첫 push를 올립니다.

```bash
git push -u origin main
```

3. Vercel에서 방금 만든 Git 저장소를 연결합니다.
2. Project Settings > Environment Variables에 `.env.example` 기준 값을 등록합니다.
3. 배포 후 실제 도메인을 Firebase Authorized domains에 다시 등록합니다.
4. 첫 배포 후 공개 링크, 로그인, 카드 저장, 폴더 내보내기까지 확인합니다.

## 5. Resend 사용 시

메일 구독/주간 digest를 실제 발송하려면:

1. Resend에서 발송 도메인을 검증합니다.
2. `RESEND_API_KEY`, `RESEND_FROM_EMAIL`을 Vercel에 등록합니다.
3. `CRON_SECRET`을 추가합니다.
4. Vercel 배포 후 cron이 동작하는지 확인합니다.

Resend 값을 넣지 않아도 앱은 동작합니다. 이 경우 메일은 실제 발송되지 않고, 현재 코드 기준의 fallback 흐름만 사용합니다.

## 6. 배포 후 체크리스트

필수 확인:

- `/` 소개 랜딩 열림
- `/workspace` 로그인 가능
- 카드 저장 가능
- 카드 메모/태그 수정 가능
- 폴더 공개 링크 생성 가능
- `/c/[slug]` 공개 페이지 접근 가능

선택 확인:

- 팔로우
- 이메일 구독
- 소식함
- AI 요약
- PDF 저장

## 7. 권장 순서

1. Firebase 웹 앱 + Google 로그인 준비
2. Vercel 프로젝트 생성
3. 환경변수 등록
4. 첫 배포
5. Firebase Authorized domains 추가
6. 공개 링크/로그인/저장 흐름 점검
7. 그다음 Resend / OpenAI 활성화
