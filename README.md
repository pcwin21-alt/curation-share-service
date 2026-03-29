# curatio

콘텐츠를 저장하고, 메모를 붙이고, 컬렉션으로 묶어 공개 링크로 공유하는 서비스입니다.

## 주요 흐름

- 소개 랜딩: `/`
- 작업공간: `/workspace`
- 공개 컬렉션: `/c/[slug]`
- 소식함: `/updates`

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 을 열면 됩니다.

## 환경변수

로컬/배포 환경변수 템플릿은 [.env.example](/c:/★_VIBE%20CODING/1%20%20개발%20단계/외부_%2305_26-03_콘텐츠%20큐레이션%20서비스/curatio/.env.example) 를 참고하세요.

## 배포

배포 절차는 [DEPLOY.md](/c:/★_VIBE%20CODING/1%20%20개발%20단계/외부_%2305_26-03_콘텐츠%20큐레이션%20서비스/curatio/DEPLOY.md) 에 정리되어 있습니다.

기본 배포 대상은 `Vercel`입니다.
