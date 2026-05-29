import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  computeBlockingPoolClaimCount,
  computeCappedPenalty,
  computeClaimCountdownData,
} from '../src/services/policyUtils.js'

describe('familyEconomyService helpers', () => {
  it('caps penalty by current credits', () => {
    assert.equal(computeCappedPenalty(20, 50), 20)
    assert.equal(computeCappedPenalty(80, 15), 15)
    assert.equal(computeCappedPenalty(0, 15), 0)
  })

  it('counts blocking pool claims with pending-check bypass enabled', () => {
    const count = computeBlockingPoolClaimCount(
      ['job-a', 'job-b', 'job-c'],
      new Set(['job-b']),
      true,
    )

    assert.equal(count, 2)
  })

  it('counts all pool claims when pending-check bypass is disabled', () => {
    const count = computeBlockingPoolClaimCount(
      ['job-a', 'job-b', 'job-c'],
      new Set(['job-b']),
      false,
    )

    assert.equal(count, 3)
  })

  it('computes countdown from per-job timeout', () => {
    const nowMs = Date.now()
    const claimedAt = new Date(nowMs - 30 * 60 * 1000)

    const result = computeClaimCountdownData({
      claimedAt,
      nowMs,
      missedAfterHours: 1,
      missedJobTimingEnabled: true,
      missedJobDefaultHours: 24,
    })

    assert.equal(result.hasTimer, true)
    assert.equal(result.expired, false)
    assert.equal(result.timeoutHours, 1)
    assert.ok(result.remainingMs > 0)
  })

  it('computes expired countdown from family default timeout', () => {
    const nowMs = Date.now()
    const claimedAt = new Date(nowMs - 3 * 60 * 60 * 1000)

    const result = computeClaimCountdownData({
      claimedAt,
      nowMs,
      missedAfterHours: 0,
      missedJobTimingEnabled: true,
      missedJobDefaultHours: 2,
    })

    assert.equal(result.hasTimer, true)
    assert.equal(result.expired, true)
    assert.equal(result.timeoutHours, 2)
    assert.ok(result.remainingMs <= 0)
  })

  it('returns no timer when timing is disabled and no per-job timeout exists', () => {
    const result = computeClaimCountdownData({
      claimedAt: new Date(),
      nowMs: Date.now(),
      missedAfterHours: 0,
      missedJobTimingEnabled: false,
      missedJobDefaultHours: 24,
    })

    assert.equal(result.hasTimer, false)
    assert.equal(result.expired, false)
    assert.equal(result.timeoutHours, null)
  })
})
