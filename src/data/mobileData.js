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

export const seedRewards = [
  { id: 'reward-1', title: 'Extra Screen Time', cost: 200, requiresApproval: true },
  { id: 'reward-2', title: 'Choose Dinner', cost: 150, requiresApproval: true },
  { id: 'reward-3', title: 'Movie Night', cost: 300, requiresApproval: true },
]

export const seedRewardRequests = [
  {
    id: 'request-1',
    rewardId: 'reward-1',
    rewardTitle: 'Extra Screen Time',
    cost: 200,
    requestedBy: 'kid-alex',
    status: 'pending',
  },
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
  { key: 'kids', label: 'Kids', path: '/mobile/children', icon: '🧒' },
  { key: 'profile', label: 'Parent', path: '/mobile/profile', icon: '👤' },
]
