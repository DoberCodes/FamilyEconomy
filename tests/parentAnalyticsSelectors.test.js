import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  getConsequenceAnalytics,
  getParentAnalyticsSummary,
} from '../src/services/parentAnalyticsSelectors.js'

describe('parent analytics selectors', () => {
  it('summarizes consequence windows and filters audit report rows', () => {
    const summary = getConsequenceAnalytics({
      now: new Date('2026-06-17T12:00:00.000Z'),
      childNameById: {
        'child-a': 'Alex',
        'child-b': 'Blair',
      },
      auditReportRange: '7',
      auditReportChildId: 'child-a',
      auditReportType: 'penalty',
      consequenceEvents: [
        {
          id: 'older',
          type: 'job_check_denied',
          createdAt: '2026-05-01T12:00:00.000Z',
          childId: 'child-a',
          jobTitle: 'Laundry',
          penaltyCredits: 4,
        },
        {
          id: 'last-week-denied',
          type: 'job_check_denied',
          createdAt: '2026-06-10T12:00:00.000Z',
          childId: 'child-b',
          jobTitle: 'Trash',
          penaltyCredits: 3,
        },
        {
          id: 'missed-no-penalty',
          type: 'job_marked_missed',
          createdAt: '2026-06-16T08:00:00.000Z',
          childId: 'child-a',
          jobTitle: 'Trash',
          penaltyCredits: 0,
        },
        {
          id: 'missed',
          type: 'job_marked_missed',
          createdAt: '2026-06-16T10:00:00.000Z',
          childId: 'child-a',
          jobTitle: 'Dishes',
          penaltyCredits: 1,
        },
        {
          id: 'newer',
          type: 'job_check_denied',
          createdAt: '2026-06-17T10:00:00.000Z',
          childId: 'child-a',
          jobTitle: 'Dishes',
          penaltyCredits: 2,
        },
      ],
    })

    assert.deepEqual(summary.consequenceEventsSorted.map((entry) => entry.id), [
      'newer',
      'missed',
      'missed-no-penalty',
      'last-week-denied',
      'older',
    ])
    assert.equal(summary.thisWeekPenaltyTotal, 3)
    assert.equal(summary.lastWeekPenaltyTotal, 3)
    assert.equal(summary.thisWeekDeniedCount, 1)
    assert.equal(summary.lastWeekDeniedCount, 1)
    assert.equal(summary.thisWeekMissedCount, 2)
    assert.deepEqual(summary.reportFilteredEvents.map((entry) => entry.id), ['newer', 'missed'])
    assert.deepEqual(summary.topConsequenceJobs, [
      { title: 'Dishes', count: 2 },
      { title: 'Trash', count: 1 },
    ])
    assert.deepEqual(summary.consequenceByChild, [
      {
        childId: 'child-a',
        childLabel: 'Alex',
        count: 3,
        penaltyCredits: 3,
      },
    ])
    assert.equal(summary.deniedPenaltyThisWeek, 2)
    assert.equal(summary.deniedPenaltyLastWeek, 3)
  })

  it('builds pressure, review, and celebration analytics', () => {
    const summary = getParentAnalyticsSummary({
      now: new Date('2026-06-17T12:00:00.000Z'),
      rewards: [
        { id: 'r1', title: 'Movie', cost: 30, pricingMeta: { dynamicPricingApplied: true, baseCost: 20, demandCount: 1 } },
        { id: 'r2', title: 'Games', cost: 15, pricingMeta: { dynamicPricingApplied: true, baseCost: 10, demandCount: 5 } },
        { id: 'r3', title: 'Treat', cost: 12, pricingMeta: { dynamicPricingApplied: true, baseCost: 10, demandCount: 9 } },
        { id: 'r4', title: 'Static', cost: 10, pricingMeta: { dynamicPricingApplied: false, baseCost: 10 } },
      ],
      jobCheckRequests: [
        {
          id: 'check-reviewed',
          status: 'approved',
          createdAt: '2026-06-16T08:00:00.000Z',
          reviewedAt: '2026-06-16T12:00:00.000Z',
        },
        {
          id: 'check-stale',
          status: 'pending',
          createdAt: '2026-06-16T10:00:00.000Z',
        },
        {
          id: 'check-fresh',
          status: 'pending',
          createdAt: '2026-06-17T11:00:00.000Z',
        },
      ],
      rewardRequests: [
        { id: 'reward-pending', status: 'pending' },
        {
          id: 'reward-fulfilled',
          status: 'fulfilled',
          rewardTitle: 'Movie',
          requestedBy: 'child-a',
          cost: 12,
          fulfilledAt: '2026-06-17T10:00:00.000Z',
        },
      ],
      jobs: [
        {
          id: 'job-done',
          title: 'Dishes',
          status: 'done',
          claimedBy: 'child-a',
          points: 3,
          completedAt: '2026-06-16T09:00:00.000Z',
        },
      ],
      goals: [
        {
          id: 'goal-completed',
          name: 'Bike',
          status: 'completed',
          childId: 'child-a',
          target: 50,
          completedAt: '2026-06-10T09:00:00.000Z',
        },
      ],
    })

    assert.deepEqual(summary.dynamicPressureRewards.map((reward) => reward.id), ['r2', 'r1', 'r3'])
    assert.equal(summary.reviewedChecks.length, 1)
    assert.equal(summary.avgReviewHours, 4)
    assert.deepEqual(summary.pendingChecks.map((request) => request.id), ['check-stale', 'check-fresh'])
    assert.deepEqual(summary.stalePendingChecks.map((request) => request.id), ['check-stale'])
    assert.deepEqual(summary.pendingRewardRequestsAnalytics.map((request) => request.id), ['reward-pending'])
    assert.deepEqual(summary.recentCelebrationEvents.map((entry) => entry.id), [
      'celebrate-reward:reward-fulfilled',
      'celebrate-job:job-done',
      'celebrate-goal:goal-completed',
    ])
    assert.equal(summary.thisWeekCelebrationEvents.length, 2)
    assert.deepEqual(summary.celebrationCounts, {
      reward_fulfilled: 1,
      job_done: 1,
    })
  })
})
