import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'

import { seedDashboard, seedGoals, seedJobs } from '../data/mobileData'
import { db, hasFirebaseConfig } from '../lib/firebase'

const DEFAULT_FAMILY_ID = 'family-main'
const DEFAULT_USER_ID = 'kid-alex'
const DEFAULT_ROLE = 'kid'

export function getActiveFamilyContext(override = {}) {
  return {
    familyId:
      override.familyId || import.meta.env.VITE_FAMILY_ID || DEFAULT_FAMILY_ID,
    userId: override.userId || import.meta.env.VITE_USER_ID || DEFAULT_USER_ID,
    userRole:
      override.userRole || import.meta.env.VITE_USER_ROLE || DEFAULT_ROLE,
  }
}

function normalizeJob(job) {
  return {
    id: job.id,
    order: Number(job.order) || 0,
    icon: job.icon || '✅',
    title: job.title || job.name || 'Untitled job',
    points: Number(job.points ?? job.reward) || 0,
    status: job.status || (job.done ? 'done' : 'open'),
    claimedBy: job.claimedBy || null,
    createdBy: job.createdBy || null,
  }
}

function normalizeGoal(goal) {
  return {
    name: goal.name || 'Untitled goal',
    saved: Number(goal.saved) || 0,
    target: Number(goal.target) || 1,
  }
}

function seededResult() {
  return {
    data: seedDashboard,
    source: 'seed',
  }
}

export async function getFamilyDashboard(context = {}) {
  const { familyId: activeFamilyId, userRole, userId } = getActiveFamilyContext(
    context,
  )
  const targetFamilyId = activeFamilyId

  if (!hasFirebaseConfig || !db) {
    return {
      ...seededResult(),
      context: { familyId: targetFamilyId, userId, userRole },
    }
  }

  const familyRef = doc(db, 'families', targetFamilyId)
  const familySnapshot = await getDoc(familyRef)

  if (!familySnapshot.exists()) {
    return {
      ...seededResult(),
      context: {
        familyId: targetFamilyId,
        userId,
        userRole,
      },
    }
  }

  const familyData = familySnapshot.data()

  const jobsSnapshot = await getDocs(collection(db, 'families', targetFamilyId, 'jobs'))
  const goalSnapshot = await getDocs(collection(db, 'families', targetFamilyId, 'goals'))

  const jobs = jobsSnapshot.empty
    ? seedJobs.map((job) => normalizeJob(job))
    : jobsSnapshot.docs
        .map((item) => normalizeJob({ id: item.id, ...item.data() }))
        .sort((a, b) => (a.order || 0) - (b.order || 0))

  const goals = goalSnapshot.empty
    ? seedGoals
    : goalSnapshot.docs.map((item) => normalizeGoal(item.data()))

  return {
    source: 'firestore',
    data: {
      profileName: familyData.profileName || seedDashboard.profileName,
      streakDays: Number(familyData.streakDays) || seedDashboard.streakDays,
      level: {
        current: Number(familyData.level?.current) || seedDashboard.level.current,
        xp: Number(familyData.level?.xp) || seedDashboard.level.xp,
        nextXp: Number(familyData.level?.nextXp) || seedDashboard.level.nextXp,
      },
      balance: {
        credits:
          Number(familyData.balance?.credits) || seedDashboard.balance.credits,
      },
      jobs,
      goals,
    },
    context: {
      familyId: targetFamilyId,
      userId,
      userRole,
    },
  }
}

export async function createJob(jobPayload, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(
    context,
  )

  if (userRole !== 'parent') {
    throw new Error('Only parents can create jobs.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const targetFamilyId = activeFamilyId
  const title = (jobPayload.title || '').trim()

  if (!title) {
    throw new Error('Job title is required.')
  }

  const points = Number(jobPayload.points) || 0

  const jobRef = await addDoc(collection(db, 'families', targetFamilyId, 'jobs'), {
    title,
    points,
    icon: jobPayload.icon || '✅',
    status: 'open',
    order: Number(jobPayload.order) || Date.now(),
    claimedBy: null,
    createdBy: userId,
    createdAt: serverTimestamp(),
  })

  return jobRef.id
}

export async function claimJob(jobId, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(
    context,
  )

  if (userRole !== 'kid') {
    throw new Error('Only kids can claim jobs.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const targetFamilyId = activeFamilyId

  await updateDoc(doc(db, 'families', targetFamilyId, 'jobs', jobId), {
    status: 'claimed',
    claimedBy: userId,
    claimedAt: serverTimestamp(),
  })
}
