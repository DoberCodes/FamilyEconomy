import { GOAL_STATUS_RANK } from '../domain/familyEconomyTypes'

export function getGoalProgressPercent(goal) {
  const saved = Number(goal?.saved) || 0
  const target = Math.max(1, Number(goal?.target) || 1)
  return Math.min(100, Math.round((saved / target) * 100))
}

export function getRemainingGoalCredits(goal) {
  return Math.max(0, Number(goal?.target) - Number(goal?.saved || 0))
}

export function countGoalsByStatus(goals = []) {
  return goals.reduce((accumulator, goal) => {
    const key = goal.status || 'active'
    accumulator[key] = (accumulator[key] || 0) + 1
    return accumulator
  }, {})
}

export function sortSavingsGoals(goals = []) {
  return goals
    .slice()
    .sort((left, right) => {
      const leftRank = GOAL_STATUS_RANK[left.status] ?? 99
      const rightRank = GOAL_STATUS_RANK[right.status] ?? 99
      if (leftRank !== rightRank) {
        return leftRank - rightRank
      }

      return getGoalProgressPercent(right) - getGoalProgressPercent(left)
    })
}

export function getSavingsGoalSummary(goals = []) {
  const sortedGoals = sortSavingsGoals(goals)
  const spotlightGoal = sortedGoals[0] || null

  return {
    goalCounts: countGoalsByStatus(goals),
    sortedGoals,
    spotlightGoal,
    spotlightGoalPct: getGoalProgressPercent(spotlightGoal),
  }
}
