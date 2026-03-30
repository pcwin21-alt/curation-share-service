import { PersonaPresetId } from '@/types'

export interface PersonaPreset {
  id: PersonaPresetId
  label: string
  shortLabel: string
  description: string
  lensKeywords: string[]
  guidingQuestions: string[]
}

export const personaPresets: PersonaPreset[] = [
  {
    id: 'toegye',
    label: '퇴계 이황 렌즈',
    shortLabel: '퇴계 이황',
    description: '본질, 수양, 태도의 관점으로 컬렉션을 다시 읽습니다.',
    lensKeywords: ['본질', '수양', '태도', '마음가짐', '절제'],
    guidingQuestions: [
      '이 묶음은 무엇을 더 깊이 생각하게 만드는가?',
      '겉의 정보보다 안의 태도에서 배울 점은 무엇인가?',
      '지금의 선택이 오래 남을 기준으로 이어지는가?',
    ],
  },
  {
    id: 'yulgok',
    label: '율곡 이이 렌즈',
    shortLabel: '율곡 이이',
    description: '실행, 질서, 공공성의 관점으로 컬렉션을 해석합니다.',
    lensKeywords: ['실행', '질서', '공공성', '책임', '구조'],
    guidingQuestions: [
      '이 아이디어는 실제 행동으로 어떻게 이어지는가?',
      '개인의 효율이 공동의 이익과 연결되는가?',
      '지속적으로 반복 가능한 구조는 무엇인가?',
    ],
  },
  {
    id: 'karpathy',
    label: '안드레 카파시 렌즈',
    shortLabel: '안드레 카파시',
    description: '시스템, 실험, 학습 루프의 관점으로 컬렉션을 재구성합니다.',
    lensKeywords: ['시스템', '실험', '학습', '루프', '단순화'],
    guidingQuestions: [
      '이 콘텐츠 묶음에서 반복 실험할 만한 가설은 무엇인가?',
      '복잡한 내용을 더 단순한 시스템으로 바꿀 수 있는가?',
      '학습 속도를 높이는 피드백 루프는 어디에 있는가?',
    ],
  },
  {
    id: 'drucker',
    label: '피터 드러커 렌즈',
    shortLabel: '피터 드러커',
    description: '목적, 성과, 조직적 가치의 관점으로 컬렉션을 읽습니다.',
    lensKeywords: ['목적', '성과', '조직', '우선순위', '의사결정'],
    guidingQuestions: [
      '이 묶음이 궁극적으로 풀고 싶은 문제는 무엇인가?',
      '무엇을 하지 않을지까지 포함해 우선순위를 정할 수 있는가?',
      '개인의 통찰이 팀의 실행으로 번지려면 무엇이 필요한가?',
    ],
  },
]

export function getPersonaPreset(id: PersonaPresetId) {
  return personaPresets.find((preset) => preset.id === id) ?? personaPresets[0]
}
