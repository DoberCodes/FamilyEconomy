import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'

import {
  seedDashboard,
  seedGoals,
  seedJobs,
  seedRewardRequests,
  seedRewards,
} from '../data/mobileData'
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

function normalizeReward(reward, fallbackId) {
  return {
    id: reward.id || fallbackId,
    title: reward.title || 'Untitled reward',
    cost: Number(reward.cost) || 0,
    requiresApproval:
      typeof reward.requiresApproval === 'boolean'
        ? reward.requiresApproval
        : true,
  }
}

function normalizeRewardRequest(request, fallbackId) {
  return {
    id: request.id || fallbackId,
    rewardId: request.rewardId || null,
    rewardTitle: request.rewardTitle || 'Unknown reward',
    cost: Number(request.cost) || 0,
    requestedBy: request.requestedBy || null,
    status: request.status || 'pending',
    reviewedBy: request.reviewedBy || null,
  }
}

function normalizeChildProfile(profile, fallbackId) {
  return {
    id: profile.id || fallbackId,
    displayName: profile.displayName || 'Kid',
    avatar: profile.avatar || '🧒',
    weeklyGoalCredits: Number(profile.weeklyGoalCredits) || 0,
    createdBy: profile.createdBy || null,
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

export async function getFamilyStoreData(context = {}) {
  const { familyId: activeFamilyId, userRole, userId } = getActiveFamilyContext(
    context,
  )

  if (!hasFirebaseConfig || !db) {
    return {
      source: 'seed',
      data: {
        rewards: seedRewards,
        requests: seedRewardRequests,
      },
      context: { familyId: activeFamilyId, userId, userRole },
    }
  }

  const rewardsSnapshot = await getDocs(
    collection(db, 'families', activeFamilyId, 'rewards'),
  )
  const requestsSnapshot = await getDocs(
    collection(db, 'families', activeFamilyId, 'rewardRequests'),
  )

  const rewards = rewardsSnapshot.empty
    ? seedRewards
    : rewardsSnapshot.docs
        .map((item) => normalizeReward({ id: item.id, ...item.data() }, item.id))
        .sort((a, b) => a.cost - b.cost)

  const requests = requestsSnapshot.empty
    ? seedRewardRequests
    : requestsSnapshot.docs
        .map((item) =>
          normalizeRewardRequest({ id: item.id, ...item.data() }, item.id),
        )
        .sort((a, b) => {
          if (a.status === b.status) {
            return 0
          }
          return a.status === 'pending' ? -1 : 1
        })

  return {
    source: 'firestore',
    data: { rewards, requests },
    context: { familyId: activeFamilyId, userId, userRole },
  }
}

export async function requestReward(reward, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(
    context,
  )

  if (userRole !== 'kid') {
    throw new Error('Only kids can request rewards.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  await addDoc(collection(db, 'families', activeFamilyId, 'rewardRequests'), {
    rewardId: reward.id,
    rewardTitle: reward.title,
    cost: Number(reward.cost) || 0,
    requestedBy: userId,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
}

export async function reviewRewardRequest(requestId, decision, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(
    context,
  )

  if (userRole !== 'parent') {
    throw new Error('Only parents can approve or deny reward requests.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  if (decision !== 'approved' && decision !== 'denied') {
    throw new Error('Decision must be approved or denied.')
  }

  const requestRef = doc(db, 'families', activeFamilyId, 'rewardRequests', requestId)
  const requestSnap = await getDoc(requestRef)

  if (!requestSnap.exists()) {
    throw new Error('Reward request not found.')
  }

  const requestData = requestSnap.data()

  if (requestData.status !== 'pending') {
    throw new Error('This reward request has already been reviewed.')
  }

  await updateDoc(requestRef, {
    status: decision,
    reviewedBy: userId,
    reviewedAt: serverTimestamp(),
  })

  if (decision === 'approved') {
    const familyRef = doc(db, 'families', activeFamilyId)
    await updateDoc(familyRef, {
      'balance.credits': increment(-(Number(requestData.cost) || 0)),
    })
  }
}

export async function getHouseholdOnboardingData(context = {}) {
  const { familyId: activeFamilyId, userRole, userId } = getActiveFamilyContext(
    context,
  )

  if (!hasFirebaseConfig || !db) {
    return {
      source: 'seed',
      data: {
        familyExists: false,
        family: null,
        childProfiles: [],
      },
      context: { familyId: activeFamilyId, userId, userRole },
    }
  }

  const familyRef = doc(db, 'families', activeFamilyId)
  const familySnap = await getDoc(familyRef)

  if (!familySnap.exists()) {
    return {
      source: 'firestore',
      data: {
        familyExists: false,
        family: null,
        childProfiles: [],
      },
      context: { familyId: activeFamilyId, userId, userRole },
    }
  }

  const childSnapshot = await getDocs(
    collection(db, 'families', activeFamilyId, 'children'),
  )

  return {
    source: 'firestore',
    data: {
      familyExists: true,
      family: {
        profileName: familySnap.data().profileName || 'My Family',
      },
      childProfiles: childSnapshot.docs
        .map((item) => normalizeChildProfile({ id: item.id, ...item.data() }, item.id))
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
    },
    context: { familyId: activeFamilyId, userId, userRole },
  }
}

export async function createHousehold(household, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(
    context,
  )

  if (userRole !== 'parent') {
    throw new Error('Only parents can create a household.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const profileName = (household.profileName || '').trim()
  if (!profileName) {
    throw new Error('Household name is required.')
  }

  await setDoc(
    doc(db, 'families', activeFamilyId),
    {
      profileName,
      streakDays: 0,
      balance: { credits: 0 },
      level: { current: 1, xp: 0, nextXp: 500 },
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function createChildProfile(childProfile, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(
    context,
  )

  if (userRole !== 'parent') {
    throw new Error('Only parents can add child profiles.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const displayName = (childProfile.displayName || '').trim()
  if (!displayName) {
    throw new Error('Child name is required.')
  }

  const avatar = (childProfile.avatar || '').trim() || '🧒'
  const weeklyGoalCredits = Number(childProfile.weeklyGoalCredits) || 0

  await addDoc(collection(db, 'families', activeFamilyId, 'children'), {
    displayName,
    avatar,
    weeklyGoalCredits,
    createdBy: userId,
    createdAt: serverTimestamp(),
  })
}
