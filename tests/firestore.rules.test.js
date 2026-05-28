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

    await setDoc(doc(db, 'families', FAMILY_ID), {
      profileName: 'Alex',
      streakDays: 4,
      balance: { credits: 900 },
      level: { current: 5, xp: 400, nextXp: 700 },
    })

    await setDoc(doc(db, 'families', FAMILY_ID, 'jobs', 'job-open'), {
      title: 'Clean kitchen',
      points: 100,
      icon: '🧽',
      status: 'open',
      claimedBy: null,
      createdBy: 'parent-1',
      order: 1,
    })

    await setDoc(doc(db, 'families', FAMILY_ID, 'jobs', 'job-locked'), {
      title: 'Read 20 minutes',
      points: 50,
      icon: '📚',
      status: 'claimed',
      claimedBy: 'kid-1',
      createdBy: 'parent-1',
      order: 2,
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
})
