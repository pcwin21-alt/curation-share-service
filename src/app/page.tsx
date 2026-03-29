'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Icon from '@/components/Icon'
import { useAuth } from '@/lib/AuthContext'

const featureCards = [
  {
    title: '저장한 이유를 함께 남깁니다',
    body: '링크만 쌓아두지 않고, 왜 저장했는지와 다음에 다시 볼 포인트를 카드마다 적고 AI 요약으로 한 번 더 정리할 수 있어요.',
    icon: 'pencil' as const,
    tone: 'bg-[#e1eee6]',
  },
  {
    title: '주제별 폴더로 차분히 정리합니다',
    body: '모아둔 콘텐츠를 관심사에 맞는 컬렉션 폴더로 묶으면, 나중에 다시 꺼내볼 때도 훨씬 수월해져요.',
    icon: 'archive' as const,
    tone: 'bg-[#f5efe0]',
  },
  {
    title: '완성한 묶음을 바로 공유합니다',
    body: '정리한 폴더마다 공개 링크를 만들고, 메일 구독과 팔로우 반응까지 함께 보며 운영할 수 있어요.',
    icon: 'share' as const,
    tone: 'bg-[#e9ecef]',
  },
]

const workflowSteps = [
  {
    step: '1',
    title: '먼저 모아둡니다',
    body: '읽어둘 링크와 텍스트 메모를 한곳에 저장하고, 나중에 다시 볼 재료를 차곡차곡 쌓아둡니다.',
  },
  {
    step: '2',
    title: '의미를 붙입니다',
    body: '카드마다 짧은 메모를 남기고 폴더로 나누면서, 왜 중요한지와 어떤 맥락인지 천천히 정리합니다.',
  },
  {
    step: '3',
    title: '공유할 묶음으로 완성합니다',
    body: '정리된 폴더를 공개 링크로 바꾸면, 다른 사람도 부담 없이 들어와 한 흐름으로 읽을 수 있어요.',
  },
]

export default function LandingPage() {
  const router = useRouter()
  const { user, loading, signInWithGoogle } = useAuth()

  async function handleStart() {
    if (!user) {
      await signInWithGoogle()
    }

    router.push('/workspace')
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-on-surface">
      <div className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_top_left,_rgba(58,107,76,0.14),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(255,255,255,0.7),_transparent_38%)]" />

      <header className="sticky top-0 z-40 border-b border-outline-variant/20 bg-background/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-headline text-[1.55rem] text-primary">
            curatio
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <a href="#about" className="type-body text-on-surface-variant transition-colors hover:text-primary">
              소개
            </a>
            <a href="#workflow" className="type-body text-on-surface-variant transition-colors hover:text-primary">
              사용하는 흐름
            </a>
            <a href="#share" className="type-body text-on-surface-variant transition-colors hover:text-primary">
              공유 방식
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/workspace"
              className="type-body rounded-full border border-outline-variant/20 px-4 py-2 font-semibold text-on-surface transition-colors hover:bg-surface"
            >
              작업 공간
            </Link>
            <button
              type="button"
              onClick={handleStart}
              disabled={loading}
              className="type-body rounded-full bg-primary px-4 py-2 font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {user ? '바로 시작' : '로그인 후 시작'}
            </button>
          </div>
        </div>
      </header>

      <main className="px-6 pb-20 pt-8 sm:pt-10">
        <section className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="py-4 lg:py-10">
            <div className="mb-5 inline-flex rounded-full border border-secondary/20 bg-secondary-container/55 px-4 py-2.5">
              <span className="text-[0.8rem] font-semibold leading-none tracking-[-0.015em] text-secondary">
                읽은 것을 흘려보내지 않는 콘텐츠 정리 작업실
              </span>
            </div>

            <h1 className="max-w-[10ch] font-headline text-[clamp(2.85rem,5.1vw,4.85rem)] leading-[0.98] tracking-[-0.045em] text-primary">
              모아둔 링크를
              <br />
              컬렉션으로
              <br />
              완성하세요.
            </h1>

            <p className="mt-7 max-w-[54ch] text-[1.06rem] leading-[1.82] tracking-[-0.018em] text-on-surface-variant">
              curatio는 저장한 링크를 폴더로 정리하고, 메모를 덧붙이고, 필요한 경우 AI로 한 번 더 요약하고,
              완성한 묶음을 공개 링크로 공유할 수 있게 도와주는 서비스입니다. 혼자만 쌓아두던 자료를 다시
              꺼내보기 쉬운 컬렉션으로 바꾸고, 팀이나 주변 사람과 자연스럽게 나눌 수 있어요.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleStart}
                disabled={loading}
                className="rounded-full bg-primary px-6 py-3.5 text-[1rem] font-semibold tracking-[-0.02em] text-on-primary transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {user ? '내 작업 공간 열기' : 'Google로 시작하기'}
              </button>
              <a
                href="#workflow"
                className="rounded-full border border-outline-variant/20 px-6 py-3.5 text-[1rem] font-semibold tracking-[-0.02em] text-on-surface transition-colors hover:bg-surface"
              >
                어떻게 쓰는지 보기
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <div className="rounded-2xl bg-surface px-5 py-4">
                <p className="text-[0.78rem] leading-none tracking-[-0.01em] text-on-surface-variant">정리 단위</p>
                <p className="mt-2 font-headline text-[1.28rem] leading-[1.15] text-primary">컬렉션 폴더</p>
              </div>
              <div className="rounded-2xl bg-surface px-5 py-4">
                <p className="text-[0.78rem] leading-none tracking-[-0.01em] text-on-surface-variant">공유 형식</p>
                <p className="mt-2 font-headline text-[1.28rem] leading-[1.15] text-primary">읽기 전용 공개 링크</p>
              </div>
              <div className="rounded-2xl bg-surface px-5 py-4">
                <p className="text-[0.78rem] leading-none tracking-[-0.01em] text-on-surface-variant">기록 방식</p>
                <p className="mt-2 font-headline text-[1.28rem] leading-[1.15] text-primary">메모와 요약</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-4 top-8 h-32 w-32 rounded-full bg-[#dfeee6] blur-3xl" />
            <div className="absolute right-8 top-0 h-28 w-28 rounded-full bg-white/70 blur-3xl" />

            <div className="relative rounded-[36px] border border-outline-variant/15 bg-surface-container-low px-5 py-5 shadow-[0_24px_80px_rgba(48,44,38,0.08)] sm:px-6 sm:py-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="type-micro font-semibold text-secondary">미리 보기</p>
                  <h2 className="mt-1 font-headline text-[1.45rem] text-primary">이렇게 정리하고 공유합니다</h2>
                </div>
                <div className="flex gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#d9d2c7]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#c9dfd2]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f0e5c1]" />
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[28px] bg-surface px-4 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="type-micro text-on-surface-variant">폴더</p>
                      <p className="font-headline text-[1.15rem] text-primary">청년 인터뷰 모아보기</p>
                    </div>
                    <span className="type-micro rounded-full bg-secondary-container px-3 py-1 font-semibold text-on-secondary-container">
                      지금 공유 중
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-surface-container-low px-4 py-3">
                      <p className="type-micro text-on-surface-variant">콘텐츠 수</p>
                      <p className="mt-1 font-headline text-[1.5rem] text-primary">28개</p>
                    </div>
                    <div className="rounded-2xl bg-surface-container-low px-4 py-3">
                      <p className="type-micro text-on-surface-variant">공개 링크</p>
                      <p className="mt-1 break-all font-headline text-[0.98rem] text-primary">
                        curatio.app/c/청년-인터뷰
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
                  <div className="rounded-[28px] bg-[#e6efe7] px-4 py-4">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-secondary">
                      <Icon name="pencil" className="h-5 w-5" />
                    </div>
                    <p className="font-headline text-[1.1rem] text-primary">보고 든 생각을 바로 남겨요</p>
                    <p className="type-body mt-2 text-on-surface-variant">
                      왜 저장했는지, 다음에 어디를 다시 볼지 카드마다 짧게 적어둘 수 있어요.
                    </p>
                  </div>

                  <div className="rounded-[28px] bg-[#f7f1e2] px-4 py-4">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-[#7A5A11]">
                      <Icon name="share" className="h-5 w-5" />
                    </div>
                    <p className="font-headline text-[1.1rem] text-primary">정리한 묶음을 바로 나눠요</p>
                    <p className="type-body mt-2 text-on-surface-variant">
                      폴더마다 링크를 만들고 필요하면 이름처럼 자연스럽게 주소를 정할 수 있어요.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="mx-auto mt-20 max-w-7xl">
          <div className="mb-8 max-w-2xl">
            <p className="type-micro mb-2 font-semibold text-secondary">서비스 소개</p>
            <h2 className="type-section text-primary">저장부터 공유까지, 한 흐름으로 이어집니다</h2>
            <p className="type-body mt-3 text-on-surface-variant">
              북마크만 늘어날수록 다시 보기 어려운 링크 모음이 되기 쉽습니다. curatio는 저장한 자료에 메모를
              붙이고, 주제별로 묶고, AI로 흐름을 다시 정리하고, 다른 사람과 보기 좋게 공유하는 과정까지 한
              화면에 담았습니다.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {featureCards.map((feature) => (
              <div key={feature.title} className={`rounded-[28px] ${feature.tone} px-5 py-6`}>
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 text-primary">
                  <Icon name={feature.icon} className="h-5 w-5" />
                </div>
                <h3 className="font-headline text-[1.18rem] text-primary">{feature.title}</h3>
                <p className="type-body mt-3 text-on-surface-variant">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="workflow" className="mx-auto mt-20 max-w-7xl">
          <div className="rounded-[32px] border border-outline-variant/20 bg-surface-container-low px-6 py-8 sm:px-8 sm:py-9">
            <div className="mb-8 max-w-2xl">
              <p className="type-micro mb-2 font-semibold text-secondary">사용 흐름</p>
              <h2 className="type-section text-primary">처음 저장한 링크가 보기 좋은 묶음이 되기까지</h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {workflowSteps.map((item) => (
                <div key={item.step} className="rounded-[28px] bg-surface px-5 py-6">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container text-[1rem] font-bold text-on-secondary-container">
                    {item.step}
                  </div>
                  <h3 className="font-headline text-[1.16rem] text-primary">{item.title}</h3>
                  <p className="type-body mt-3 text-on-surface-variant">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="share" className="mx-auto mt-20 grid max-w-7xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[32px] bg-[#dae8df] px-6 py-8 sm:px-8">
            <p className="type-micro mb-2 font-semibold text-secondary">공유 방식</p>
            <h2 className="type-section text-primary">폴더마다 링크를 만들고 필요하면 다시 닫을 수 있습니다</h2>
            <p className="type-body mt-4 text-on-surface-variant">
              공개 컬렉션은 폴더마다 따로 링크를 만들 수 있습니다. 주소는 서비스 규칙 안에서 직접 정할 수 있고,
              비공개로 돌리면 기존 링크로도 더는 열리지 않아요. 링크를 연 사람은 읽기 전용으로 보고, 원하면
              메일 구독이나 팔로우로 다음 업데이트를 이어서 받을 수 있습니다.
            </p>

            <div className="mt-6 space-y-3">
              <div className="rounded-2xl bg-white/75 px-4 py-3">
                <p className="type-micro text-on-surface-variant">예시 링크</p>
                <p className="mt-1 font-headline text-[1.05rem] text-primary">
                  curatio.app/c/브랜드-아카이브-2026
                </p>
              </div>
              <div className="rounded-2xl bg-white/75 px-4 py-3">
                <p className="type-micro text-on-surface-variant">링크를 열면</p>
                <p className="type-body mt-1 text-on-surface">
                  읽기 전용으로 보이고, 원문 링크와 작성한 메모까지 한 흐름으로 확인할 수 있어요.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-outline-variant/20 bg-surface px-6 py-8 sm:px-8">
            <p className="type-micro mb-2 font-semibold text-secondary">이런 분들께 잘 맞아요</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] bg-surface-container-low px-4 py-4">
                <p className="font-headline text-[1.08rem] text-primary">리서치 팀</p>
                <p className="type-body mt-2 text-on-surface-variant">
                  자료를 주제별 폴더와 링크로 나눠 팀 안에서 같이 보기 좋은 형태로 건넬 수 있어요.
                </p>
              </div>
              <div className="rounded-[24px] bg-surface-container-low px-4 py-4">
                <p className="font-headline text-[1.08rem] text-primary">콘텐츠 에디터</p>
                <p className="type-body mt-2 text-on-surface-variant">
                  참고 자료를 메모와 함께 묶어두고, 다음 기획으로 자연스럽게 이어갈 수 있어요.
                </p>
              </div>
              <div className="rounded-[24px] bg-surface-container-low px-4 py-4">
                <p className="font-headline text-[1.08rem] text-primary">커뮤니티 운영자</p>
                <p className="type-body mt-2 text-on-surface-variant">
                  주제별 추천 링크를 보기 좋게 묶어 멤버들에게 부담 없이 나눌 수 있어요.
                </p>
              </div>
              <div className="rounded-[24px] bg-surface-container-low px-4 py-4">
                <p className="font-headline text-[1.08rem] text-primary">개인 아카이브</p>
                <p className="type-body mt-2 text-on-surface-variant">
                  흩어진 북마크를 다시 꺼내보기 쉬운 묶음으로 바꾸고, 필요할 때만 조용히 공유할 수 있어요.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-20 max-w-7xl">
          <div className="rounded-[36px] bg-primary px-6 py-10 text-center text-on-primary sm:px-10">
            <p className="type-micro mb-2 font-semibold text-white/70">시작하기</p>
            <h2 className="font-headline text-[clamp(2rem,4vw,3rem)] leading-[1.02] tracking-[-0.04em]">
              그냥 쌓아두던 자료를
              <br />
              다시 꺼내 보는 컬렉션으로 바꿔보세요
            </h2>
            <p className="type-body mx-auto mt-4 max-w-2xl text-white/75">
              첫 저장부터 공개 링크까지, curatio가 정리의 흐름을 부드럽게 이어드립니다.
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={handleStart}
                disabled={loading}
                className="type-body rounded-full bg-white px-6 py-3 font-semibold text-primary transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {user ? '내 작업 공간으로' : '지금 시작하기'}
              </button>
              <Link
                href="/workspace"
                className="type-body rounded-full border border-white/20 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10"
              >
                작업 공간 둘러보기
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
