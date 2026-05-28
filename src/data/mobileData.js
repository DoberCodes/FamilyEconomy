export const seedLevel = {
  current: 7,
  xp: 1250,
  nextXp: 1800,
}

export const seedBalance = {
  credits: 1250,
}

export const seedJobs = [
  { id: 'job-1', icon: '🛏️', title: 'Make your bed', points: 50, status: 'done' },
  {
    id: 'job-2',
    icon: '🛠️',
    title: 'Clean the kitchen',
    points: 100,
    status: 'done',
  },
  {
    id: 'job-3',
    icon: '📖',
    title: 'Read for 20 minutes',
    points: 75,
    status: 'open',
  },
  {
    id: 'job-4',
    icon: '🛍️',
    title: 'Help with groceries',
    points: 75,
    status: 'open',
  },
]

export const seedGoals = [
  { name: 'New Bike', saved: 2750, target: 4000 },
  { name: 'Camera', saved: 320, target: 800 },
]

export const seedDashboard = {
  profileName: 'Alex',
  level: seedLevel,
  balance: seedBalance,
  jobs: seedJobs,
  goals: seedGoals,
  streakDays: 5,
}

export const tabs = [
  { key: 'home', label: 'Home', path: '/mobile/home', icon: '🏠' },
  { key: 'jobs', label: 'Jobs', path: '/mobile/jobs', icon: '✅' },
  { key: 'store', label: 'Store', path: '/mobile/store', icon: '🛒' },
  { key: 'savings', label: 'Savings', path: '/mobile/savings', icon: '💰' },
  { key: 'profile', label: 'Profile', path: '/mobile/profile', icon: '👤' },
]
