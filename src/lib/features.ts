export const featureFlags = {
  follows: process.env.NEXT_PUBLIC_ENABLE_FOLLOWS !== 'false',
  subscriptions: process.env.NEXT_PUBLIC_ENABLE_SUBSCRIPTIONS !== 'false',
  updates: process.env.NEXT_PUBLIC_ENABLE_UPDATES !== 'false',
  analytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'false',
  aiSummary: process.env.NEXT_PUBLIC_ENABLE_AI_SUMMARY !== 'false',
}
