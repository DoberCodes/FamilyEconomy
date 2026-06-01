export const KID_PROFILE_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'rules', label: 'Family News' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'statement', label: 'Credits' },
  { key: 'savings', label: 'Savings' },
  { key: 'rewards', label: 'Rewards' },
]

export const EMPTY_KID_DASHBOARD = {
  profileName: '',
  level: { current: 1, xp: 0, nextXp: 500 },
  balance: { credits: 0 },
  jobs: [],
  goals: [],
  streakDays: 0,
}
