export type Platform =
  | 'youtube'
  | 'brunch'
  | 'facebook'
  | 'linkedin'
  | 'instagram'
  | 'naver'
  | 'twitter'
  | 'text'
  | 'other'

export interface ContentCard {
  id: string
  url?: string
  platform: Platform
  ownerUid?: string
  ownerName?: string
  title: string
  summary: string[]
  keyInsight: string
  contextMemo: string
  tags: string[]
  thumbnailUrl?: string
  folderIds: string[]
  status: 'saving' | 'analyzing' | 'done' | 'error'
  rawText?: string
  updatedAt: number
  analysisError?: string
  analysisWarnings?: string[]
  analysisVersion?: number
  createdAt: number
}

export interface UserProfile {
  uid: string
  email: string
  nickname: string
  photoURL?: string
  createdAt: number
}

export interface FolderAnalytics {
  viewCount: number
  uniqueVisitorCount: number
  totalDwellMs: number
  totalCardsViewed: number
  cardViewCounts?: Record<string, number>
  lastViewedAt?: number
}

export interface CurationFolder {
  id: string
  name: string
  description: string
  isPublic: boolean
  shareSlug?: string
  ownerUid?: string
  ownerName?: string
  cardIds: string[]
  slug: string
  color?: string
  analytics?: FolderAnalytics
  followerCount?: number
  emailSubscriberCount?: number
  sharedAt?: number
  createdAt: number
  updatedAt: number
}

export interface CollectionSummaryReference {
  title: string
  reason: string
}

export interface CollectionSummaryTakeaway {
  point: string
  sources: string[]
}

export interface CollectionSummaryResult {
  overview: string
  keyTakeaways: CollectionSummaryTakeaway[]
  sectionSummary: string
  nextActions: string[]
  sourceSpotlights: CollectionSummaryReference[]
  suggestedQuestions: string[]
  sourceCount: number
  usedFallback?: boolean
}

export type EmailSubscriberStatus = 'pending' | 'confirmed' | 'unsubscribed'

export interface EmailSubscriber {
  id: string
  folderId: string
  email: string
  status: EmailSubscriberStatus
  verifyTokenHash?: string
  unsubscribeTokenHash?: string
  createdAt: number
  updatedAt: number
  confirmedAt?: number | null
  lastVerificationSentAt?: number | null
  lastDigestQueuedAt?: number | null
  lastDigestSentAt?: number | null
  unsubscribedAt?: number | null
  userUid?: string | null
}

export interface FollowingCollection {
  id: string
  folderId: string
  collectionName: string
  shareSlug?: string
  ownerName?: string
  followedAt: number
}

export interface CollectionNotification {
  id: string
  eventId: string
  folderId: string
  collectionName: string
  shareSlug: string
  ownerName?: string
  weekKey: string
  unread: boolean
  addedCount: number
  addedCardIds: string[]
  addedCardTitles: string[]
  createdAt: number
  lastTriggeredAt: number
  lastReadAt?: number | null
}

export interface CollectionUpdateEvent {
  id: string
  folderId: string
  weekKey: string
  collectionName: string
  shareSlug: string
  ownerName?: string
  addedCardIds: string[]
  addedCardTitles: string[]
  addedCount: number
  createdAt: number
  updatedAt: number
  lastCardAddedAt: number
  digestStatus?: 'pending' | 'queued' | 'sent'
  digestQueuedAt?: number | null
  digestSentAt?: number | null
}
