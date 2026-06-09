#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { cert, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

loadDotEnv(path.join(repoRoot, '.env'))

const projectId = env('DEMO_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_PROJECT_ID', 'FIREBASE_PROJECT_ID')
const familyId = env('DEMO_FAMILY_ID') || 'family-demo'
const demoEmail = env('DEMO_PARENT_EMAIL', 'VITE_DEMO_PARENT_EMAIL') || 'demo@familyeconomy.app'
const demoPassword = env('DEMO_PARENT_PASSWORD', 'VITE_DEMO_PARENT_PASSWORD') || 'FamilyDemo123!'
const demoDisplayName = env('DEMO_PARENT_DISPLAY_NAME') || 'Demo Parent'

if (!projectId) {
  fail('Missing Firebase project id. Set VITE_FIREBASE_PROJECT_ID, FIREBASE_PROJECT_ID, or DEMO_FIREBASE_PROJECT_ID.')
}

const app = initializeApp({
  projectId,
  credential: resolveCredential(),
})

const auth = getAuth(app)
const db = getFirestore(app)

const childAvaId = 'child-ava'
const childLeoId = 'child-leo'

try {
  const user = await createOrUpdateDemoUser()
  await resetDemoData(user.uid)

  console.log('')
  console.log('Demo user reset complete.')
  console.log(`Email:    ${demoEmail}`)
  console.log(`Password: ${demoPassword}`)
  console.log(`Family:   ${familyId}`)
  console.log('')
} catch (error) {
  console.error('Demo reset failed:')
  console.error(error)
  process.exitCode = 1
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue
    }

    const index = trimmed.indexOf('=')
    const key = trimmed.slice(0, index).trim()
    let value = trimmed.slice(index + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

function env(...keys) {
  for (const key of keys) {
    const value = String(process.env[key] || '').trim()
    if (value) {
      return value
    }
  }
  return ''
}

function resolveCredential() {
  const serviceAccountJson = env('FIREBASE_SERVICE_ACCOUNT_JSON')
  const serviceAccountPath = env('FIREBASE_SERVICE_ACCOUNT_PATH')

  if (serviceAccountJson) {
    return cert(JSON.parse(serviceAccountJson))
  }

  if (serviceAccountPath) {
    const resolvedPath = path.isAbsolute(serviceAccountPath)
      ? serviceAccountPath
      : path.resolve(repoRoot, serviceAccountPath)
    return cert(JSON.parse(fs.readFileSync(resolvedPath, 'utf8')))
  }

  fail([
    'Missing Firebase Admin credentials for the demo reset script.',
    '',
    'Set this before running npm run demo:reset:',
    '',
    '  FIREBASE_SERVICE_ACCOUNT_PATH=./path-to-service-account.json',
    '',
    'For CI only, FIREBASE_SERVICE_ACCOUNT_JSON is also supported.',
    '',
    'The service account JSON file should not be committed. Common service-account filenames are ignored by .gitignore.',
  ].join('\n'))
}

async function createOrUpdateDemoUser() {
  try {
    const user = await auth.getUserByEmail(demoEmail)
    return auth.updateUser(user.uid, {
      displayName: demoDisplayName,
      password: demoPassword,
      emailVerified: true,
      disabled: false,
    })
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') {
      throw error
    }

    return auth.createUser({
      email: demoEmail,
      password: demoPassword,
      displayName: demoDisplayName,
      emailVerified: true,
      disabled: false,
    })
  }
}

async function resetDemoData(uid) {
  await deleteFamilyTree(familyId)
  await deleteProfilesForFamily(familyId)
  await deleteAnalyticsForFamily(familyId)

  const now = new Date()
  const at = (daysAgo, hoursAgo = 0) =>
    Timestamp.fromDate(new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - hoursAgo * 60 * 60 * 1000))

  const familyFundContributionHistory = [
    {
      id: 'fund-ava-jobs',
      childId: childAvaId,
      amount: 75,
      source: 'job_income_contribution',
      createdAt: at(1, 3),
    },
    {
      id: 'fund-leo-reward',
      childId: childLeoId,
      amount: 50,
      source: 'reward_contribution',
      createdAt: at(2, 2),
    },
  ]

  await db.collection('users').doc(uid).set({
    email: demoEmail,
    displayName: demoDisplayName,
    familyId,
    role: 'parent',
    demoAccount: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })

  await db.collection('families').doc(familyId).set({
    profileName: 'The Demo Crew',
    familyRules: [
      'Try your best before asking for help.',
      'If plans change, communicate before a claimed chore expires.',
      'Save for goals before spending everything at once.',
      'Community Funds help the family build something together.',
    ].join('\n'),
    familyAnnouncement: 'Family News: This demo household has jobs, rewards, savings goals, a shared fund, recognition, and parent settings ready to explore.',
    familyFundEnabled: true,
    familyFundName: 'Community Funds',
    familyFundBalance: 125,
    familyFundContributionHistory,
    familyFundIncomeTaxEnabled: true,
    familyFundIncomeTaxPercent: 10,
    familyFundSalesTaxEnabled: true,
    familyFundSalesTaxPercent: 5,
    childSavingsAccountsEnabled: true,
    childSavingsWithdrawalsEnabled: true,
    childSessionSecurityEnabled: false,
    dynamicPricingEnabled: true,
    dynamicPricingWindowPeriod: 'week',
    dynamicPricingDemandWeight: 10,
    dynamicPricingScarcityWeight: 12,
    dynamicPricingMinMultiplierPercent: 90,
    dynamicPricingMaxMultiplierPercent: 160,
    dynamicPricingMaxStepPercent: 25,
    savingsGoalApprovalMode: 'claim_only',
    rewardRequestApprovalMode: 'required',
    jobCheckApprovalMode: 'required',
    missedJobConsequenceEnabled: true,
    missedJobPenaltyCredits: 5,
    missedJobTimingEnabled: true,
    missedJobDefaultHours: 48,
    failedJobCheckConsequenceEnabled: false,
    failedJobCheckPenaltyCredits: 0,
    maxActivePoolClaimsPerChild: 2,
    allowClaimingWithPendingChecks: true,
    staleJobBonusEnabled: true,
    staleJobBonusStartHours: 12,
    staleJobBonusPeriodHours: 12,
    staleJobBonusRatePercent: 8,
    staleJobBonusCapPercent: 45,
    familyDashboardTopCardsEnabled: true,
    achievementsEnabled: true,
    familyRecognitionEnabled: true,
    achievementFirstGoalTarget: 1,
    achievementContributorCreditsTarget: 100,
    achievementHelperJobsTarget: 3,
    achievementReadingJobsTarget: 3,
    recognitionStreakDaysTarget: 3,
    recognitionHelpingHandJobsTarget: 1,
    recognitionGoalGetterTarget: 1,
    customBadges: [
      {
        id: 'demo-community-builder',
        label: 'Community Builder',
        icon: '\u{1F49B}',
        category: 'achievement',
        metric: 'contribution_credits',
        target: 100,
      },
      {
        id: 'demo-reading-spark',
        label: 'Reading Spark',
        icon: '\u{1F4DA}',
        category: 'recognition',
        metric: 'reading_jobs',
        target: 2,
      },
    ],
    streakDays: 4,
    balance: { credits: 0 },
    level: { current: 4, xp: 640, nextXp: 780 },
    demoSeededAt: Timestamp.now(),
    createdBy: uid,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })

  await writeDocs(`families/${familyId}/children`, {
    [childAvaId]: {
      displayName: 'Ava',
      avatar: '\u{1F467}',
      credits: 180,
      savingsBalance: 90,
      weeklyGoalCredits: 300,
      sessionCodeEnabled: false,
      sessionCode: '',
      allowChildSetSessionCode: false,
      createdBy: uid,
      createdAt: at(21),
      updatedAt: at(0, 2),
    },
    [childLeoId]: {
      displayName: 'Leo',
      avatar: '\u{1F466}',
      credits: 135,
      savingsBalance: 60,
      weeklyGoalCredits: 250,
      sessionCodeEnabled: false,
      sessionCode: '',
      allowChildSetSessionCode: false,
      createdBy: uid,
      createdAt: at(21),
      updatedAt: at(0, 2),
    },
  })

  await writeDocs(`families/${familyId}/jobs`, {
    'job-done-dishes': job({
      title: 'Unload dishwasher',
      points: 20,
      order: 1,
      status: 'done',
      claimedBy: childAvaId,
      badgeContribution: 'helper',
      completedAt: at(0, 2),
    }),
    'job-done-dinner': job({
      title: 'Help prepare dinner',
      points: 100,
      order: 2,
      status: 'done',
      claimedBy: childLeoId,
      badgeContribution: 'helper',
      completedAt: at(1, 1),
    }),
    'job-done-reading': job({
      title: 'Read for 30 minutes',
      points: 50,
      order: 3,
      status: 'done',
      claimedBy: childAvaId,
      badgeContribution: 'reading',
      completedAt: at(2, 3),
    }),
    'job-done-yard': job({
      title: 'Water the garden',
      points: 35,
      order: 4,
      status: 'done',
      claimedBy: childLeoId,
      completedAt: at(3, 2),
    }),
    'job-open-bed': job({
      title: 'Make your bed',
      points: 20,
      order: 5,
      status: 'open',
      childId: childAvaId,
      createdAt: at(0, 4),
    }),
    'job-open-laundry': job({
      title: 'Fold laundry',
      points: 45,
      order: 6,
      status: 'open',
      createdAt: at(2),
    }),
    'job-open-garage': job({
      title: 'Sweep garage',
      points: 60,
      order: 7,
      status: 'open',
      createdAt: at(3),
    }),
    'job-claimed-room': job({
      title: 'Reset bedroom',
      points: 40,
      order: 8,
      status: 'claimed',
      claimedBy: childAvaId,
      claimedAt: at(0, 5),
      missedAfterHours: 48,
    }),
  })

  await writeDocs(`families/${familyId}/rewards`, {
    'reward-movie-night': reward({
      title: 'Movie Night Pick',
      cost: 175,
      familyClaimLimitCount: 1,
      familyClaimLimitPeriod: 'week',
    }),
    'reward-screen-time': reward({
      title: 'Extra Screen Time',
      cost: 120,
      claimLimitCount: 2,
      claimLimitPeriod: 'week',
    }),
    'reward-ice-cream': reward({
      title: 'Ice Cream Stop',
      cost: 160,
      requiresApproval: true,
    }),
    'reward-lego': reward({
      title: 'Lego Starwars Set',
      cost: 300,
      repeatMode: 'once',
      childId: childAvaId,
    }),
  })

  await writeDocs(`families/${familyId}/rewardRequests`, {
    'request-pending-movie': {
      requestKind: 'purchase',
      childId: childAvaId,
      rewardId: 'reward-movie-night',
      rewardTitle: 'Movie Night Pick',
      cost: 175,
      costBeforeTax: 175,
      salesTaxPercent: 5,
      salesTaxAmount: 9,
      totalCost: 184,
      requestedBy: childAvaId,
      status: 'pending',
      childNote: 'Can we watch the space movie this weekend?',
      createdAt: at(0, 1),
      updatedAt: at(0, 1),
    },
    'request-approved-screen': {
      requestKind: 'purchase',
      childId: childLeoId,
      rewardId: 'reward-screen-time',
      rewardTitle: 'Extra Screen Time',
      cost: 120,
      requestedBy: childLeoId,
      status: 'approved',
      reviewedBy: uid,
      parentNote: 'Approved after homework.',
      createdAt: at(1, 2),
      reviewedAt: at(1, 1),
      updatedAt: at(1, 1),
    },
    'request-counter-pet': {
      requestKind: 'proposal',
      childId: childLeoId,
      rewardId: null,
      rewardTitle: 'Stay up late',
      cost: 80,
      requestedBy: childLeoId,
      status: 'countered',
      childNote: 'For Friday night.',
      parentNote: 'Countering with a family game night instead.',
      counterRewardTitle: 'Family Game Night',
      counterCost: 90,
      reviewedBy: uid,
      createdAt: at(2, 3),
      reviewedAt: at(2, 1),
      updatedAt: at(2, 1),
    },
  })

  await writeDocs(`families/${familyId}/jobCheckRequests`, {
    'check-room-pending': {
      jobId: 'job-claimed-room',
      childId: childAvaId,
      jobTitle: 'Reset bedroom',
      rewardType: 'credits',
      points: 40,
      requestedBy: childAvaId,
      status: 'pending',
      createdAt: at(0, 1),
    },
    'check-dishes-approved': {
      jobId: 'job-done-dishes',
      childId: childAvaId,
      jobTitle: 'Unload dishwasher',
      rewardType: 'credits',
      points: 20,
      requestedBy: childAvaId,
      status: 'approved',
      reviewedBy: uid,
      createdAt: at(0, 3),
      reviewedAt: at(0, 2),
    },
  })

  await writeDocs(`families/${familyId}/goals`, {
    'goal-family-vacation': {
      name: 'Family Vacation To Florida',
      childId: null,
      target: 2000,
      saved: 125,
      status: 'active',
      contributionHistory: familyFundContributionHistory,
      createdBy: uid,
      createdAt: at(12),
      updatedAt: at(0, 2),
    },
    'goal-ava-lego': {
      name: 'Lego Starwars Set',
      rewardId: 'reward-lego',
      rewardTitle: 'Lego Starwars Set',
      childId: childAvaId,
      target: 300,
      saved: 120,
      status: 'active',
      contributionHistory: [
        { id: 'ava-lego-1', childId: childAvaId, amount: 70, source: 'wallet', createdAt: at(4) },
        { id: 'ava-lego-2', childId: childAvaId, amount: 50, source: 'savings_account', createdAt: at(1) },
      ],
      createdBy: childAvaId,
      createdAt: at(8),
      updatedAt: at(1),
    },
    'goal-leo-art': {
      name: 'Watercolor Art Kit',
      childId: childLeoId,
      target: 220,
      saved: 220,
      status: 'ready_to_claim',
      readyToClaimAt: at(0, 4),
      contributionHistory: [
        { id: 'leo-art-1', childId: childLeoId, amount: 120, source: 'wallet', createdAt: at(5) },
        { id: 'leo-art-2', childId: childLeoId, amount: 100, source: 'savings_account', createdAt: at(0, 4) },
      ],
      createdBy: childLeoId,
      createdAt: at(9),
      updatedAt: at(0, 4),
    },
    'goal-ava-first': {
      name: 'First Goal',
      childId: childAvaId,
      target: 100,
      saved: 100,
      status: 'completed',
      completedAt: at(6),
      approvedAt: at(6),
      approvedBy: uid,
      contributionHistory: [
        { id: 'ava-first-1', childId: childAvaId, amount: 100, source: 'wallet', createdAt: at(7) },
      ],
      createdBy: childAvaId,
      createdAt: at(10),
      updatedAt: at(6),
    },
  })

  await writeDocs(`families/${familyId}/transactions`, {
    'txn-ava-job': transaction(childAvaId, 20, 'credit', 'Unload dishwasher earned credits', at(0, 2)),
    'txn-leo-job': transaction(childLeoId, 100, 'credit', 'Help prepare dinner earned credits', at(1, 1)),
    'txn-ava-save': transaction(childAvaId, -50, 'savings', 'Moved credits to Lego Starwars Set', at(1)),
    'txn-leo-reward': transaction(childLeoId, -120, 'reward', 'Extra Screen Time approved', at(1, 1)),
    'txn-family-fund': transaction(childAvaId, -25, 'family_fund', 'Contributed to Community Funds', at(2)),
  })

  await writeDocs(`families/${familyId}/consequenceEvents`, {
    'event-missed-demo': {
      childId: childAvaId,
      jobId: 'job-claimed-room',
      jobTitle: 'Reset bedroom',
      type: 'missed_job_marked',
      penaltyCredits: 5,
      note: 'Demo event: parent can use consequences carefully when plans change without communication.',
      createdBy: uid,
      createdAt: at(5),
    },
  })

  await writeDocs(`families/${familyId}/feedbackEntries`, {
    'feedback-demo': {
      title: 'Demo feedback item',
      body: 'This shows where parent feedback entries appear for creator review.',
      status: 'open',
      createdBy: uid,
      createdAt: at(2),
      updatedAt: at(2),
    },
  })

  await writeDocs('analyticsEvents', {
    'demo-onboarding-started': analytics('onboarding_started', uid, at(14)),
    'demo-onboarding-completed': analytics('onboarding_completed', uid, at(13)),
    'demo-dashboard-viewed': analytics('family_dashboard_viewed', uid, at(0, 1)),
  })
}

function job(overrides) {
  const points = Number(overrides.points) || 0
  return {
    icon: overrides.icon || '\u{2705}',
    title: overrides.title,
    rewardType: overrides.rewardType || 'credits',
    basePoints: points,
    points,
    status: overrides.status || 'open',
    childId: overrides.childId || null,
    claimedBy: overrides.claimedBy || null,
    claimLimitCount: overrides.claimLimitCount || 0,
    claimLimitPeriod: overrides.claimLimitPeriod || null,
    familyClaimLimitCount: overrides.familyClaimLimitCount || 0,
    familyClaimLimitPeriod: overrides.familyClaimLimitPeriod || null,
    claimLimitKey: overrides.title.toLowerCase(),
    autoRecreate: Boolean(overrides.autoRecreate),
    badgeContribution: overrides.badgeContribution || 'none',
    missedAfterHours: overrides.missedAfterHours || null,
    requiresApproval: overrides.requiresApproval ?? null,
    order: overrides.order || 0,
    createdBy: overrides.createdBy || demoEmail,
    createdAt: overrides.createdAt || Timestamp.now(),
    claimedAt: overrides.claimedAt || null,
    completedAt: overrides.completedAt || null,
  }
}

function reward(overrides) {
  return {
    title: overrides.title,
    childId: overrides.childId || null,
    baseCost: Number(overrides.cost) || 0,
    cost: Number(overrides.cost) || 0,
    repeatMode: overrides.repeatMode || 'recur',
    claimLimitCount: overrides.claimLimitCount || 0,
    claimLimitPeriod: overrides.claimLimitPeriod || null,
    familyClaimLimitCount: overrides.familyClaimLimitCount || 0,
    familyClaimLimitPeriod: overrides.familyClaimLimitPeriod || null,
    requiresApproval: overrides.requiresApproval ?? true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }
}

function transaction(childId, amount, type, description, createdAt) {
  return {
    childId,
    amount,
    credits: amount,
    type,
    description,
    createdAt,
  }
}

function analytics(eventName, userId, createdAt) {
  return {
    eventName,
    familyId,
    userId,
    childId: null,
    source: 'demo_seed',
    createdBy: userId,
    createdAt,
  }
}

async function writeDocs(collectionPath, docsById) {
  const entries = Object.entries(docsById)
  const chunks = []
  for (let index = 0; index < entries.length; index += 400) {
    chunks.push(entries.slice(index, index + 400))
  }

  for (const chunk of chunks) {
    const batch = db.batch()
    for (const [id, data] of chunk) {
      batch.set(db.collection(collectionPath).doc(id), data)
    }
    await batch.commit()
  }
}

async function deleteFamilyTree(targetFamilyId) {
  const familyRef = db.collection('families').doc(targetFamilyId)
  await deleteDocumentTree(familyRef)
}

async function deleteProfilesForFamily(targetFamilyId) {
  const snapshot = await db.collection('users').where('familyId', '==', targetFamilyId).get()
  await deleteSnapshotDocs(snapshot)
}

async function deleteAnalyticsForFamily(targetFamilyId) {
  const snapshot = await db.collection('analyticsEvents').where('familyId', '==', targetFamilyId).get()
  await deleteSnapshotDocs(snapshot)
}

async function deleteDocumentTree(docRef) {
  const collections = await docRef.listCollections()
  for (const collectionRef of collections) {
    await deleteCollectionTree(collectionRef)
  }
  await docRef.delete()
}

async function deleteCollectionTree(collectionRef) {
  while (true) {
    const snapshot = await collectionRef.limit(100).get()
    if (snapshot.empty) {
      break
    }

    for (const documentSnapshot of snapshot.docs) {
      await deleteDocumentTree(documentSnapshot.ref)
    }
  }
}

async function deleteSnapshotDocs(snapshot) {
  const docs = snapshot.docs
  for (let index = 0; index < docs.length; index += 400) {
    const batch = db.batch()
    docs.slice(index, index + 400).forEach((documentSnapshot) => {
      batch.delete(documentSnapshot.ref)
    })
    await batch.commit()
  }
}

function fail(message) {
  console.error(message)
  process.exit(1)
}
