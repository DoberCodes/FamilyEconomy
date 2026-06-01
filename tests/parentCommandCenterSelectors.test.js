import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  getParentCommandCenterRequestSummary,
  getRewardDemandRows,
} from '../src/services/parentCommandCenterSelectors.js'

describe('parent command center selectors', () => {
  it('groups reward demand rows by reward title and top claimant', () => {
    const rows = getRewardDemandRows(
      [
        { rewardTitle: 'Movie Night', requestedBy: 'child-b' },
        { rewardTitle: 'Movie Night', requestedBy: 'child-a' },
        { rewardTitle: 'Movie Night', requestedBy: 'child-a' },
        { rewardTitle: 'Extra Game', requestedBy: 'child-b' },
      ],
      {
        'child-a': 'Alex',
        'child-b': 'Blair',
      },
    )

    assert.deepEqual(rows, [
      {
        title: 'Movie Night',
        count: 3,
        claimantId: 'child-a',
        claimantCount: 2,
        claimantLabel: 'Alex',
        claimantTotal: 2,
      },
      {
        title: 'Extra Game',
        count: 1,
        claimantId: 'child-b',
        claimantCount: 1,
        claimantLabel: 'Blair',
        claimantTotal: 1,
      },
    ])
  })

  it('builds parent request queues and aggregate pending count', () => {
    const summary = getParentCommandCenterRequestSummary({
      jobCheckRequests: [
        { id: 'check-1', status: 'pending' },
        { id: 'check-2', status: 'approved' },
      ],
      rewardRequests: [
        { id: 'reward-1', status: 'pending' },
        { id: 'reward-2', status: 'countered' },
        {
          id: 'reward-3',
          status: 'approved',
          requestKind: 'purchase',
          autoApproved: true,
          rewardTitle: 'Movie Night',
          requestedBy: 'child-a',
        },
        {
          id: 'reward-4',
          status: 'approved',
          requestKind: 'purchase',
          autoApproved: true,
          notificationDismissedAt: '2026-01-01T00:00:00.000Z',
          rewardTitle: 'Movie Night',
          requestedBy: 'child-a',
        },
      ],
      goals: [
        { id: 'goal-1', status: 'pending_parent_approval' },
        { id: 'goal-2', status: 'ready_to_claim' },
        { id: 'goal-3', status: 'active' },
      ],
      childNameById: {
        'child-a': 'Alex',
      },
    })

    assert.deepEqual(summary.pendingJobCheckRequests.map((item) => item.id), ['check-1'])
    assert.deepEqual(summary.pendingRewardRequests.map((item) => item.id), ['reward-1'])
    assert.deepEqual(summary.counteredRewardRequests.map((item) => item.id), ['reward-2'])
    assert.deepEqual(summary.rewardNotifications.map((item) => item.id), ['reward-3'])
    assert.deepEqual(summary.approvedRewardRequests.map((item) => item.id), ['reward-3', 'reward-4'])
    assert.deepEqual(summary.pendingGoalRequests.map((item) => item.id), ['goal-1'])
    assert.deepEqual(summary.pendingGoalApprovals.map((item) => item.id), ['goal-2'])
    assert.equal(summary.rewardDemandRows[0].title, 'Movie Night')
    assert.equal(summary.rewardDemandRows[0].count, 2)
    assert.equal(summary.rewardDemandRows[0].claimantLabel, 'Alex')
    assert.equal(summary.pendingRequestsCount, 8)
  })
})
