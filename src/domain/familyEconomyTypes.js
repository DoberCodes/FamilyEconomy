/** @typedef {'open' | 'claimed' | 'done'} JobStatus */
/** @typedef {'active' | 'pending_parent_approval' | 'ready_to_claim' | 'countered' | 'completed' | 'denied'} GoalStatus */
/** @typedef {'pending' | 'approved' | 'fulfilled' | 'denied' | 'countered' | 'redirected_to_pool'} RewardRequestStatus */
/** @typedef {'required' | 'no_approval'} ApprovalMode */
/** @typedef {'parent' | 'kid'} UserRole */

export const JOB_STATUS = Object.freeze({
  OPEN: 'open',
  CLAIMED: 'claimed',
  DONE: 'done',
})

export const GOAL_STATUS = Object.freeze({
  ACTIVE: 'active',
  PENDING_PARENT_APPROVAL: 'pending_parent_approval',
  READY_TO_CLAIM: 'ready_to_claim',
  COUNTERED: 'countered',
  COMPLETED: 'completed',
  DENIED: 'denied',
})

export const REWARD_REQUEST_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  FULFILLED: 'fulfilled',
  DENIED: 'denied',
  COUNTERED: 'countered',
  REDIRECTED_TO_POOL: 'redirected_to_pool',
})

export const REWARD_TYPE = Object.freeze({
  CREDITS: 'credits',
  XP: 'xp',
})

export const APPROVAL_MODE = Object.freeze({
  REQUIRED: 'required',
  NO_APPROVAL: 'no_approval',
})

export const SAVINGS_GOAL_APPROVAL_MODE = Object.freeze({
  CLAIM_ONLY: 'claim_only',
  CREATE_AND_CLAIM: 'create_and_claim',
  NO_APPROVAL: 'no_approval',
})

export const GOAL_STATUS_RANK = Object.freeze({
  [GOAL_STATUS.READY_TO_CLAIM]: 0,
  [GOAL_STATUS.ACTIVE]: 1,
  [GOAL_STATUS.PENDING_PARENT_APPROVAL]: 2,
  [GOAL_STATUS.COUNTERED]: 3,
  [GOAL_STATUS.COMPLETED]: 4,
  [GOAL_STATUS.DENIED]: 5,
})

export const JOB_STATUS_RANK = Object.freeze({
  [JOB_STATUS.CLAIMED]: 0,
  [JOB_STATUS.OPEN]: 1,
  [JOB_STATUS.DONE]: 2,
})

export function getJobStatusLabel(status) {
  if (status === JOB_STATUS.CLAIMED) {
    return 'In Progress'
  }
  if (status === JOB_STATUS.OPEN) {
    return 'Open'
  }
  if (status === JOB_STATUS.DONE) {
    return 'Done'
  }
  return 'Unknown'
}

export function getGoalStatusLabel(status) {
  if (status === GOAL_STATUS.COMPLETED) {
    return 'Completed'
  }
  if (status === GOAL_STATUS.PENDING_PARENT_APPROVAL) {
    return 'Pending Parent'
  }
  if (status === GOAL_STATUS.READY_TO_CLAIM) {
    return 'Ready for Parent'
  }
  if (status === GOAL_STATUS.COUNTERED) {
    return 'Countered'
  }
  if (status === GOAL_STATUS.DENIED) {
    return 'Denied'
  }
  return 'Saving'
}

export function getRewardRequestStatusLabel(status) {
  if (status === REWARD_REQUEST_STATUS.APPROVED) {
    return 'Approved'
  }
  if (status === REWARD_REQUEST_STATUS.REDIRECTED_TO_POOL) {
    return 'Added To Family Pool'
  }
  if (status === REWARD_REQUEST_STATUS.DENIED) {
    return 'Denied'
  }
  if (status === REWARD_REQUEST_STATUS.COUNTERED) {
    return 'Countered'
  }
  if (status === REWARD_REQUEST_STATUS.FULFILLED) {
    return 'Fulfilled'
  }
  return 'Pending'
}

export function getStatementStatusLabel(status) {
  if (status === 'posted') {
    return 'Got'
  }
  if (status === REWARD_REQUEST_STATUS.APPROVED) {
    return 'Bought'
  }
  if (status === REWARD_REQUEST_STATUS.FULFILLED) {
    return 'Fulfilled'
  }
  if (status === REWARD_REQUEST_STATUS.DENIED) {
    return 'Denied'
  }
  return 'Pending'
}

export function getRequestTone(status) {
  if (
    status === REWARD_REQUEST_STATUS.APPROVED
    || status === REWARD_REQUEST_STATUS.FULFILLED
    || status === REWARD_REQUEST_STATUS.REDIRECTED_TO_POOL
    || status === 'posted'
  ) {
    return 'done'
  }
  if (status === REWARD_REQUEST_STATUS.DENIED) {
    return 'waiting'
  }
  if (status === REWARD_REQUEST_STATUS.COUNTERED) {
    return 'ready'
  }
  return 'active'
}

export function getActivityBadgeMeta(kind) {
  if (kind === 'goal-complete') {
    return { label: 'Milestone', tone: 'milestone' }
  }
  if (kind === 'reward-fulfilled') {
    return { label: 'Delivered', tone: 'delivered' }
  }
  if (kind === 'reward-approved') {
    return { label: 'Approved', tone: 'approved' }
  }
  if (kind === 'goal-progress') {
    return { label: 'Progress', tone: 'progress' }
  }
  if (kind === 'job') {
    return { label: 'Win', tone: 'win' }
  }
  return { label: 'Update', tone: 'default' }
}
