import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { after, before, beforeEach, describe, it } from 'node:test'

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'

const PROJECT_ID = 'family-economy-rules-test'
const FAMILY_ID = 'family-main'

let testEnv

function userDb(uid) {
  return testEnv.authenticatedContext(uid).firestore()
}

async function seedBaseData() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()

    await setDoc(doc(db, 'users', 'parent-1'), {
      displayName: 'Parent User',
      email: 'parent@example.com',
      familyId: FAMILY_ID,
      role: 'parent',
    })

    await setDoc(doc(db, 'users', 'kid-1'), {
      displayName: 'Kid User',
      email: 'kid@example.com',
      familyId: FAMILY_ID,
      role: 'kid',
    })

    await setDoc(doc(db, 'users', 'outsider-1'), {
      displayName: 'Outsider',
      email: 'outsider@example.com',
      familyId: 'other-family',
      role: 'kid',
    })

    await setDoc(doc(db, 'users', 'parent-new'), {
      displayName: 'New Parent',
      email: 'newparent@example.com',
      familyId: 'family-new',
      role: 'parent',
    })

    await setDoc(doc(db, 'families', FAMILY_ID), {
      profileName: 'Alex',
      streakDays: 4,
      balance: { credits: 900 },
      level: { current: 5, xp: 400, nextXp: 700 },
    })

    await setDoc(doc(db, 'families', FAMILY_ID, 'jobs', 'job-open'), {
      title: 'Clean kitchen',
      rewardType: 'credits',
      points: 100,
      icon: '🧽',
      status: 'open',
      claimedBy: null,
      createdBy: 'parent-1',
      order: 1,
    })

    await setDoc(doc(db, 'families', FAMILY_ID, 'jobs', 'job-locked'), {
      title: 'Read 20 minutes',
      rewardType: 'credits',
      points: 50,
      icon: '📚',
      status: 'claimed',
      claimedBy: 'kid-1',
      createdBy: 'parent-1',
      order: 2,
    })

    await setDoc(doc(db, 'families', FAMILY_ID, 'rewards', 'reward-1'), {
      title: 'Movie Night',
      cost: 300,
      requiresApproval: true,
    })

    await setDoc(doc(db, 'families', FAMILY_ID, 'rewardRequests', 'req-1'), {
      rewardId: 'reward-1',
      rewardTitle: 'Movie Night',
      cost: 300,
      requestedBy: 'kid-1',
      status: 'pending',
    })

    await setDoc(doc(db, 'families', FAMILY_ID, 'rewardRequests', 'req-countered'), {
      requestKind: 'proposal',
      rewardId: null,
      rewardTitle: 'Arcade Pass',
      cost: 250,
      requestedBy: 'kid-1',
      status: 'countered',
      counterRewardTitle: 'Arcade Pass (Weekend)',
      counterCost: 300,
    })

    await setDoc(doc(db, 'families', FAMILY_ID, 'children', 'child-1'), {
      displayName: 'Alex',
      avatar: '🧒',
      weeklyGoalCredits: 300,
      createdBy: 'parent-1',
    })

    await setDoc(doc(db, 'families', FAMILY_ID, 'feedbackEntries', 'feedback-1'), {
      category: 'general',
      message: 'Looks good',
      status: 'open',
      createdBy: 'parent-1',
    })

    await setDoc(doc(db, 'families', FAMILY_ID, 'consequenceEvents', 'event-1'), {
      type: 'job_marked_missed',
      childId: 'kid-1',
      jobId: 'job-locked',
      jobTitle: 'Read 20 minutes',
      penaltyCredits: 5,
      createdBy: 'parent-1',
      source: 'markJobAsMissed',
      createdAt: Date.now(),
    })
  })
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8'),
    },
  })
})

after(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await seedBaseData()
})

describe('Firestore Rules', () => {
  it('allows parent to create a job', async () => {
    const db = userDb('parent-1')

    await assertSucceeds(
      setDoc(doc(db, 'families', FAMILY_ID, 'jobs', 'job-new'), {
        title: 'Take out trash',
        points: 60,
        icon: '🗑️',
        status: 'open',
        claimedBy: null,
        createdBy: 'parent-1',
        order: 3,
      }),
    )
  })

  it('denies kid from creating a job', async () => {
    const db = userDb('kid-1')

    await assertFails(
      setDoc(doc(db, 'families', FAMILY_ID, 'jobs', 'job-kid-created'), {
        title: 'Attempt create',
        points: 10,
        icon: '❌',
        status: 'open',
        claimedBy: null,
        createdBy: 'kid-1',
        order: 99,
      }),
    )
  })

  it('allows kid to claim an open job for themselves', async () => {
    const db = userDb('kid-1')

    await assertSucceeds(
      updateDoc(doc(db, 'families', FAMILY_ID, 'jobs', 'job-open'), {
        status: 'claimed',
        claimedBy: 'kid-1',
      }),
    )
  })

  it('denies kid from changing job points', async () => {
    const db = userDb('kid-1')

    await assertFails(
      updateDoc(doc(db, 'families', FAMILY_ID, 'jobs', 'job-open'), {
        status: 'claimed',
        claimedBy: 'kid-1',
        points: 1000,
      }),
    )
  })

  it('denies non-family user from reading family data', async () => {
    const db = userDb('outsider-1')

    await assertFails(getDoc(doc(db, 'families', FAMILY_ID)))
  })

  it('allows user to read own profile only', async () => {
    const kidDb = userDb('kid-1')

    await assertSucceeds(getDoc(doc(kidDb, 'users', 'kid-1')))
    await assertFails(getDoc(doc(kidDb, 'users', 'parent-1')))
  })

  it('denies unauthenticated reads', async () => {
    const anonDb = testEnv.unauthenticatedContext().firestore()

    await assertFails(getDoc(doc(anonDb, 'families', FAMILY_ID)))
  })

  it('keeps claimed job immutable for kids', async () => {
    const db = userDb('kid-1')

    await assertFails(
      updateDoc(doc(db, 'families', FAMILY_ID, 'jobs', 'job-locked'), {
        status: 'done',
      }),
    )
  })

  it('lets parent update existing jobs', async () => {
    const db = userDb('parent-1')

    await assertSucceeds(
      updateDoc(doc(db, 'families', FAMILY_ID, 'jobs', 'job-open'), {
        points: 120,
      }),
    )

    const updated = await getDoc(doc(db, 'families', FAMILY_ID, 'jobs', 'job-open'))
    assert.equal(updated.data().points, 120)
  })

  it('allows kid to create reward request for themselves', async () => {
    const db = userDb('kid-1')

    await assertSucceeds(
      setDoc(doc(db, 'families', FAMILY_ID, 'rewardRequests', 'req-kid-new'), {
        rewardId: 'reward-1',
        rewardTitle: 'Movie Night',
        cost: 300,
        requestedBy: 'kid-1',
        status: 'pending',
      }),
    )
  })

  it('denies kid from creating reward request for another user', async () => {
    const db = userDb('kid-1')

    await assertFails(
      setDoc(doc(db, 'families', FAMILY_ID, 'rewardRequests', 'req-bad'), {
        rewardId: 'reward-1',
        rewardTitle: 'Movie Night',
        cost: 300,
        requestedBy: 'kid-2',
        status: 'pending',
      }),
    )
  })

  it('allows parent to approve reward requests', async () => {
    const db = userDb('parent-1')

    await assertSucceeds(
      updateDoc(doc(db, 'families', FAMILY_ID, 'rewardRequests', 'req-1'), {
        status: 'approved',
        reviewedBy: 'parent-1',
      }),
    )
  })

  it('allows parent-mediated child sessions to create auto-approved reward purchases', async () => {
    const db = userDb('parent-1')

    await assertSucceeds(
      setDoc(doc(db, 'families', FAMILY_ID, 'rewardRequests', 'req-auto-approved'), {
        requestKind: 'purchase',
        rewardId: 'reward-1',
        rewardTitle: 'Movie Night',
        cost: 300,
        childId: 'child-1',
        requestedBy: 'child-1',
        status: 'approved',
        autoApproved: true,
        sessionActor: 'parent_child_session',
        performedByParentId: 'parent-1',
      }),
    )
  })

  it('denies parent-created approved reward requests without auto-approval metadata', async () => {
    const db = userDb('parent-1')

    await assertFails(
      setDoc(doc(db, 'families', FAMILY_ID, 'rewardRequests', 'req-approved-without-auto'), {
        requestKind: 'purchase',
        rewardId: 'reward-1',
        rewardTitle: 'Movie Night',
        cost: 300,
        childId: 'child-1',
        requestedBy: 'child-1',
        status: 'approved',
        autoApproved: false,
      }),
    )
  })

  it('denies kid from approving reward requests', async () => {
    const db = userDb('kid-1')

    await assertFails(
      updateDoc(doc(db, 'families', FAMILY_ID, 'rewardRequests', 'req-1'), {
        status: 'approved',
        reviewedBy: 'kid-1',
      }),
    )
  })

  it('allows kid to accept countered proposal terms on own reward request', async () => {
    const db = userDb('kid-1')

    await assertSucceeds(
      updateDoc(doc(db, 'families', FAMILY_ID, 'rewardRequests', 'req-countered'), {
        status: 'pending',
      }),
    )
  })

  it('denies kid from updating non-countered reward request', async () => {
    const db = userDb('kid-1')

    await assertFails(
      updateDoc(doc(db, 'families', FAMILY_ID, 'rewardRequests', 'req-1'), {
        status: 'denied',
      }),
    )
  })

  it('allows parent to create feedback entries', async () => {
    const db = userDb('parent-1')

    await assertSucceeds(
      setDoc(doc(db, 'families', FAMILY_ID, 'feedbackEntries', 'feedback-new'), {
        category: 'bug',
        message: 'Need a clearer savings screen.',
        status: 'open',
        createdBy: 'parent-1',
      }),
    )
  })

  it('denies kid from creating feedback entries', async () => {
    const db = userDb('kid-1')

    await assertFails(
      setDoc(doc(db, 'families', FAMILY_ID, 'feedbackEntries', 'feedback-kid'), {
        category: 'bug',
        message: 'Kid feedback attempt',
        status: 'open',
        createdBy: 'kid-1',
      }),
    )
  })

  it('allows family members to create analytics events', async () => {
    const parentDb = userDb('parent-1')
    const kidDb = userDb('kid-1')

    await assertSucceeds(
      setDoc(doc(parentDb, 'analyticsEvents', 'event-parent'), {
        eventName: 'family_dashboard_viewed',
        familyId: FAMILY_ID,
        createdBy: 'parent-1',
        eventTimestamp: Date.now(),
      }),
    )

    await assertSucceeds(
      setDoc(doc(kidDb, 'analyticsEvents', 'event-kid'), {
        eventName: 'job_claimed',
        familyId: FAMILY_ID,
        createdBy: 'kid-1',
        eventTimestamp: Date.now(),
      }),
    )
  })

  it('denies outsiders from creating analytics events for another family', async () => {
    const db = userDb('outsider-1')

    await assertFails(
      setDoc(doc(db, 'analyticsEvents', 'event-outsider'), {
        eventName: 'job_claimed',
        familyId: FAMILY_ID,
        createdBy: 'outsider-1',
        eventTimestamp: Date.now(),
      }),
    )
  })

  it('allows parent to bootstrap a new family document', async () => {
    const db = userDb('parent-new')

    await assertSucceeds(
      setDoc(doc(db, 'families', 'family-new'), {
        profileName: 'New Family',
        balance: { credits: 0 },
      }),
    )
  })

  it('allows parent to create child profiles', async () => {
    const db = userDb('parent-1')

    await assertSucceeds(
      setDoc(doc(db, 'families', FAMILY_ID, 'children', 'child-2'), {
        displayName: 'Sam',
        avatar: '🧑',
        weeklyGoalCredits: 400,
        createdBy: 'parent-1',
      }),
    )
  })

  it('allows family members to read consequence events', async () => {
    const kidDb = userDb('kid-1')
    const parentDb = userDb('parent-1')

    await assertSucceeds(getDoc(doc(kidDb, 'families', FAMILY_ID, 'consequenceEvents', 'event-1')))
    await assertSucceeds(getDoc(doc(parentDb, 'families', FAMILY_ID, 'consequenceEvents', 'event-1')))
  })

  it('allows parent and denies kid for consequence event writes', async () => {
    const parentDb = userDb('parent-1')
    const kidDb = userDb('kid-1')

    await assertSucceeds(
      setDoc(doc(parentDb, 'families', FAMILY_ID, 'consequenceEvents', 'event-new'), {
        type: 'job_check_denied',
        childId: 'kid-1',
        jobId: 'job-open',
        jobTitle: 'Clean kitchen',
        penaltyCredits: 0,
        createdBy: 'parent-1',
        source: 'reviewJobCheckRequest',
        createdAt: Date.now(),
      }),
    )

    await assertFails(
      setDoc(doc(kidDb, 'families', FAMILY_ID, 'consequenceEvents', 'event-kid'), {
        type: 'job_check_denied',
        childId: 'kid-1',
        jobId: 'job-open',
        jobTitle: 'Clean kitchen',
        penaltyCredits: 0,
        createdBy: 'kid-1',
        source: 'reviewJobCheckRequest',
        createdAt: Date.now(),
      }),
    )
  })

  it('denies kid from creating child profiles', async () => {
    const db = userDb('kid-1')

    await assertFails(
      setDoc(doc(db, 'families', FAMILY_ID, 'children', 'child-kid-create'), {
        displayName: 'Nope',
        avatar: '🙅',
        weeklyGoalCredits: 100,
        createdBy: 'kid-1',
      }),
    )
  })
})
