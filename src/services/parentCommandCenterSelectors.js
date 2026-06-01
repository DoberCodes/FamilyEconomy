export function getRewardDemandRows(approvedRewardRequests = [], childNameById = {}, limit = 5) {
  return Object.entries(
    approvedRewardRequests.reduce((accumulator, request) => {
      const title = request.rewardTitle || 'Unknown reward'
      const claimantId = request.requestedBy || request.childId || 'unknown'

      if (!accumulator[title]) {
        accumulator[title] = {
          count: 0,
          claimantCounts: {},
        }
      }

      accumulator[title].count += 1
      accumulator[title].claimantCounts[claimantId] = (accumulator[title].claimantCounts[claimantId] || 0) + 1
      return accumulator
    }, {}),
  )
    .map(([title, aggregate]) => {
      const topClaimant = Object.entries(aggregate.claimantCounts)
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0] || []

      return {
        title,
        count: aggregate.count,
        claimantId: topClaimant[0] || '',
        claimantCount: topClaimant[1] || 0,
        claimantLabel: childNameById[topClaimant[0]] || 'Family',
        claimantTotal: Object.keys(aggregate.claimantCounts).length,
      }
    })
    .sort((left, right) => right.count - left.count || left.title.localeCompare(right.title))
    .slice(0, limit)
}

export function getParentCommandCenterRequestSummary({
  jobCheckRequests = [],
  rewardRequests = [],
  goals = [],
  childNameById = {},
} = {}) {
  const pendingJobCheckRequests = jobCheckRequests.filter((request) => request.status === 'pending')
  const pendingRewardRequests = rewardRequests.filter((request) => request.status === 'pending')
  const counteredRewardRequests = rewardRequests.filter((request) => request.status === 'countered')
  const rewardNotifications = rewardRequests.filter(
    (request) =>
      request.status === 'approved'
      && request.requestKind === 'purchase'
      && request.autoApproved
      && !request.notificationDismissedAt,
  )
  const approvedRewardRequests = rewardRequests.filter(
    (request) => request.status === 'approved' && request.requestKind === 'purchase',
  )
  const pendingGoalRequests = goals.filter((goal) => goal.status === 'pending_parent_approval')
  const pendingGoalApprovals = goals.filter((goal) => goal.status === 'ready_to_claim')
  const rewardDemandRows = getRewardDemandRows(approvedRewardRequests, childNameById)
  const pendingRequestsCount =
    pendingJobCheckRequests.length
    + pendingRewardRequests.length
    + counteredRewardRequests.length
    + rewardNotifications.length
    + approvedRewardRequests.length
    + pendingGoalRequests.length
    + pendingGoalApprovals.length

  return {
    pendingJobCheckRequests,
    pendingRewardRequests,
    counteredRewardRequests,
    rewardNotifications,
    approvedRewardRequests,
    rewardDemandRows,
    pendingGoalRequests,
    pendingGoalApprovals,
    pendingRequestsCount,
  }
}
