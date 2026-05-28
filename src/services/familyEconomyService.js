import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'

import { db, hasFirebaseConfig } from '../lib/firebase'

const DEFAULT_FAMILY_ID = 'family-main'
const DEFAULT_USER_ID = 'kid-alex'
const DEFAULT_ROLE = 'kid'

function normalizePricingWindow(period) {
  return period === 'day' || period === 'week' ? period : 'week'
}

function normalizeFamilyPricingSettings(familyData = {}) {
  return {
    dynamicPricingEnabled: Boolean(familyData.dynamicPricingEnabled),
    dynamicPricingWindowPeriod: normalizePricingWindow(familyData.dynamicPricingWindowPeriod),
    dynamicPricingDemandWeight: Math.max(0, Number(familyData.dynamicPricingDemandWeight) || 0),
    dynamicPricingScarcityWeight: Math.max(0, Number(familyData.dynamicPricingScarcityWeight) || 0),
  }
}

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
    childId: job.childId || null,
    order: Number(job.order) || 0,
    icon: job.icon || '✅',
    title: job.title || job.name || 'Untitled job',
    points: Number(job.points ?? job.reward) || 0,
    status: job.status || (job.done ? 'done' : 'open'),
    claimedBy: job.claimedBy || null,
    claimLimitCount: Number(job.claimLimitCount) || 0,
    claimLimitPeriod:
      job.claimLimitPeriod === 'day' || job.claimLimitPeriod === 'week'
        ? job.claimLimitPeriod
        : null,
    familyClaimLimitCount: Number(job.familyClaimLimitCount) || 0,
    familyClaimLimitPeriod:
      job.familyClaimLimitPeriod === 'day' || job.familyClaimLimitPeriod === 'week'
        ? job.familyClaimLimitPeriod
        : null,
    claimLimitKey: job.claimLimitKey || null,
    autoRecreate: Boolean(job.autoRecreate),
    claimedAt: job.claimedAt || null,
    completedAt: job.completedAt || null,
    createdAt: job.createdAt || null,
    createdBy: job.createdBy || null,
  }
}

function normalizeJobLimitKey(title) {
  return (title || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function normalizeGoal(goal, fallbackId) {
  return {
    id: goal.id || fallbackId || null,
    childId: goal.childId || null,
    name: goal.name || 'Untitled goal',
    saved: Number(goal.saved) || 0,
    target: Number(goal.target) || 1,
  }
}

function normalizeReward(reward, fallbackId) {
  return {
    id: reward.id || fallbackId,
    childId: reward.childId || null,
    title: reward.title || 'Untitled reward',
    baseCost: Number(reward.baseCost ?? reward.cost) || 0,
    cost: Number(reward.cost) || 0,
    repeatMode: reward.repeatMode === 'once' ? 'once' : 'recur',
    claimLimitCount: Number(reward.claimLimitCount) || 0,
    claimLimitPeriod:
      reward.claimLimitPeriod === 'day' || reward.claimLimitPeriod === 'week'
        ? reward.claimLimitPeriod
        : null,
    familyClaimLimitCount: Number(reward.familyClaimLimitCount) || 0,
    familyClaimLimitPeriod:
      reward.familyClaimLimitPeriod === 'day' || reward.familyClaimLimitPeriod === 'week'
        ? reward.familyClaimLimitPeriod
        : null,
    requiresApproval:
      typeof reward.requiresApproval === 'boolean'
        ? reward.requiresApproval
        : true,
  }
}

function calculateRewardAdjustedCost(reward, rewardRequests, pricingSettings) {
  const baseCost = Number(reward.baseCost ?? reward.cost) || 0

  if (!pricingSettings.dynamicPricingEnabled) {
    return {
      adjustedCost: baseCost,
      pricingMeta: {
        dynamicPricingApplied: false,
        baseCost,
        demandCount: 0,
        scarcityRatio: 0,
        windowPeriod: pricingSettings.dynamicPricingWindowPeriod,
      },
    }
  }

  const windowStart = startOfCurrentWindow(pricingSettings.dynamicPricingWindowPeriod)
  const demandCount = rewardRequests
    .filter((item) => item.rewardId === reward.id)
    .filter((item) => item.status === 'pending' || item.status === 'approved')
    .filter((item) => {
      const createdAt = item.createdAt?.toDate?.() || null
      if (!windowStart || !createdAt) {
        return false
      }
      return createdAt >= windowStart
    }).length

  const demandWeight = Number(pricingSettings.dynamicPricingDemandWeight) || 0
  const scarcityWeight = Number(pricingSettings.dynamicPricingScarcityWeight) || 0

  const demandMultiplier = 1 + (demandCount * demandWeight) / 100

  let scarcityRatio = 0
  if (reward.familyClaimLimitCount > 0) {
    scarcityRatio = Math.min(1, demandCount / reward.familyClaimLimitCount)
  }

  const scarcityMultiplier = 1 + scarcityRatio * (scarcityWeight / 100)
  const adjustedCost = Math.max(1, Math.round(baseCost * demandMultiplier * scarcityMultiplier))

  return {
    adjustedCost,
    pricingMeta: {
      dynamicPricingApplied: adjustedCost !== baseCost,
      baseCost,
      demandCount,
      scarcityRatio,
      windowPeriod: pricingSettings.dynamicPricingWindowPeriod,
    },
  }
}

function startOfCurrentWindow(period) {
  const now = new Date()

  if (period === 'day') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }

  if (period === 'week') {
    const start = new Date(now)
    const day = start.getDay()
    const daysSinceMonday = (day + 6) % 7
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - daysSinceMonday)
    return start
  }

  return null
}

function normalizeRewardRequest(request, fallbackId) {
  return {
    id: request.id || fallbackId,
    childId: request.childId || null,
    rewardId: request.rewardId || null,
    rewardTitle: request.rewardTitle || 'Unknown reward',
    cost: Number(request.cost) || 0,
    requestedBy: request.requestedBy || null,
    status: request.status || 'pending',
    reviewedBy: request.reviewedBy || null,
    createdAt: request.createdAt || null,
    reviewedAt: request.reviewedAt || null,
  }
}

function normalizeChildProfile(profile, fallbackId) {
  return {
    id: profile.id || fallbackId,
    displayName: profile.displayName || 'Kid',
    avatar: profile.avatar || '🧒',
    weeklyGoalCredits: Number(profile.weeklyGoalCredits) || 0,
    credits: Number(profile.credits) || 0,
    sessionCodeEnabled: Boolean(profile.sessionCodeEnabled),
    sessionCode: profile.sessionCode || '',
    allowChildSetSessionCode: Boolean(profile.allowChildSetSessionCode),
    createdBy: profile.createdBy || null,
  }
}

function normalizeJobCheckRequest(request, fallbackId) {
  return {
    id: request.id || fallbackId,
    jobId: request.jobId || null,
    childId: request.childId || null,
    jobTitle: request.jobTitle || 'Unknown job',
    points: Number(request.points) || 0,
    requestedBy: request.requestedBy || null,
    status: request.status || 'pending',
    reviewedBy: request.reviewedBy || null,
  }
}

function emptyDashboardResult() {
  return {
    data: {
      profileName: '',
      streakDays: 0,
      level: {
        current: 1,
        xp: 0,
        nextXp: 500,
      },
      balance: {
        credits: 0,
      },
      jobs: [],
      goals: [],
    },
    source: 'empty',
  }
}

export async function getFamilyDashboard(context = {}) {
  const { familyId: activeFamilyId, userRole, userId } = getActiveFamilyContext(
    context,
  )
  const selectedChildId = context.selectedChildId || null
  const targetFamilyId = activeFamilyId

  if (!hasFirebaseConfig || !db) {
    return {
      ...emptyDashboardResult(),
      context: { familyId: targetFamilyId, userId, userRole },
    }
  }

  const familyRef = doc(db, 'families', targetFamilyId)
  const familySnapshot = await getDoc(familyRef)

  if (!familySnapshot.exists()) {
    return {
      ...emptyDashboardResult(),
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

  const jobs = jobsSnapshot.docs
    .map((item) => normalizeJob({ id: item.id, ...item.data() }))
    .filter((job) =>
      selectedChildId ? !job.childId || job.childId === selectedChildId : true,
    )
    .sort((a, b) => (a.order || 0) - (b.order || 0))

  const goals = goalSnapshot.docs
    .map((item) => normalizeGoal({ id: item.id, ...item.data() }, item.id))
    .filter((goal) =>
      selectedChildId ? !goal.childId || goal.childId === selectedChildId : true,
    )

  let selectedChild = null
  if (selectedChildId) {
    const selectedChildRef = doc(db, 'families', targetFamilyId, 'children', selectedChildId)
    const selectedChildSnap = await getDoc(selectedChildRef)
    if (selectedChildSnap.exists()) {
      selectedChild = normalizeChildProfile(
        { id: selectedChildSnap.id, ...selectedChildSnap.data() },
        selectedChildSnap.id,
      )
    }
  }

  return {
    source: 'firestore',
    data: {
      profileName: selectedChild?.displayName || familyData.profileName || '',
      streakDays: Number(familyData.streakDays) || 0,
      level: {
        current: Number(familyData.level?.current) || 1,
        xp: Number(familyData.level?.xp) || 0,
        nextXp: Number(familyData.level?.nextXp) || 500,
      },
      balance: {
        credits: selectedChild ? Number(selectedChild.credits) || 0 : Number(familyData.balance?.credits) || 0,
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
  const claimLimitCount = Number(jobPayload.claimLimitCount) || 0
  const claimLimitPeriod =
    jobPayload.claimLimitPeriod === 'day' || jobPayload.claimLimitPeriod === 'week'
      ? jobPayload.claimLimitPeriod
      : null
  const familyClaimLimitCount = Number(jobPayload.familyClaimLimitCount) || 0
  const familyClaimLimitPeriod =
    jobPayload.familyClaimLimitPeriod === 'day' || jobPayload.familyClaimLimitPeriod === 'week'
      ? jobPayload.familyClaimLimitPeriod
      : null
  const claimLimitKey = normalizeJobLimitKey(title)
  const autoRecreate = Boolean(jobPayload.autoRecreate)

  const jobRef = await addDoc(collection(db, 'families', targetFamilyId, 'jobs'), {
    title,
    points,
    icon: jobPayload.icon || '✅',
    childId: jobPayload.childId || null,
    claimLimitCount,
    claimLimitPeriod: claimLimitCount > 0 ? claimLimitPeriod || 'week' : null,
    familyClaimLimitCount,
    familyClaimLimitPeriod:
      familyClaimLimitCount > 0 ? familyClaimLimitPeriod || 'week' : null,
    claimLimitKey: claimLimitCount > 0 ? claimLimitKey : null,
    autoRecreate,
    status: 'open',
    order: Number(jobPayload.order) || Date.now(),
    claimedBy: null,
    createdBy: userId,
    createdAt: serverTimestamp(),
  })

  return jobRef.id
}

export async function updateJob(jobId, jobPayload, context = {}) {
  const { familyId: activeFamilyId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent') {
    throw new Error('Only parents can update jobs.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const title = (jobPayload.title || '').trim()
  if (!title) {
    throw new Error('Job title is required.')
  }

  const points = Number(jobPayload.points) || 0
  const claimLimitCount = Number(jobPayload.claimLimitCount) || 0
  const claimLimitPeriod =
    jobPayload.claimLimitPeriod === 'day' || jobPayload.claimLimitPeriod === 'week'
      ? jobPayload.claimLimitPeriod
      : null
  const familyClaimLimitCount = Number(jobPayload.familyClaimLimitCount) || 0
  const familyClaimLimitPeriod =
    jobPayload.familyClaimLimitPeriod === 'day' || jobPayload.familyClaimLimitPeriod === 'week'
      ? jobPayload.familyClaimLimitPeriod
      : null
  const claimLimitKey = normalizeJobLimitKey(title)
  const autoRecreate = Boolean(jobPayload.autoRecreate)

  await updateDoc(doc(db, 'families', activeFamilyId, 'jobs', jobId), {
    title,
    points,
    childId: jobPayload.childId || null,
    claimLimitCount,
    claimLimitPeriod: claimLimitCount > 0 ? claimLimitPeriod || 'week' : null,
    familyClaimLimitCount,
    familyClaimLimitPeriod:
      familyClaimLimitCount > 0 ? familyClaimLimitPeriod || 'week' : null,
    claimLimitKey: claimLimitCount > 0 ? claimLimitKey : null,
    autoRecreate,
    updatedAt: serverTimestamp(),
  })
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
  const jobRef = doc(db, 'families', targetFamilyId, 'jobs', jobId)
  const jobSnap = await getDoc(jobRef)

  if (!jobSnap.exists()) {
    throw new Error('Job not found.')
  }

  const jobData = normalizeJob({ id: jobSnap.id, ...jobSnap.data() })
  if (jobData.status !== 'open') {
    throw new Error('Only open jobs can be claimed.')
  }

  if (jobData.childId && jobData.childId !== userId) {
    throw new Error('This job is assigned to a different child.')
  }

  const limitCount = Number(jobData.claimLimitCount) || 0
  const limitPeriod = jobData.claimLimitPeriod
  const familyLimitCount = Number(jobData.familyClaimLimitCount) || 0
  const familyLimitPeriod = jobData.familyClaimLimitPeriod
  const limitKey = jobData.claimLimitKey || normalizeJobLimitKey(jobData.title)

  if (limitCount > 0 && limitPeriod && limitKey) {
    const windowStart = startOfCurrentWindow(limitPeriod)
    const myJobsSnapshot = await getDocs(
      query(
        collection(db, 'families', targetFamilyId, 'jobs'),
        where('claimedBy', '==', userId),
      ),
    )

    const usedClaims = myJobsSnapshot.docs
      .map((item) => normalizeJob({ id: item.id, ...item.data() }))
      .filter((item) => item.claimLimitKey === limitKey)
      .filter((item) => item.status === 'claimed' || item.status === 'done')
      .filter((item) => {
        const claimedAt = item.claimedAt?.toDate?.() || null
        if (!windowStart || !claimedAt) {
          return false
        }
        return claimedAt >= windowStart
      }).length

    if (usedClaims >= limitCount) {
      const readablePeriod = limitPeriod === 'day' ? 'today' : 'this week'
      throw new Error(
        `You already reached this job limit (${limitCount} per ${limitPeriod}) ${readablePeriod}.`,
      )
    }
  }

  if (familyLimitCount > 0 && familyLimitPeriod && limitKey) {
    const windowStart = startOfCurrentWindow(familyLimitPeriod)
    const jobsSnapshot = await getDocs(collection(db, 'families', targetFamilyId, 'jobs'))

    const usedFamilyClaims = jobsSnapshot.docs
      .map((item) => normalizeJob({ id: item.id, ...item.data() }))
      .filter((item) => item.claimLimitKey === limitKey)
      .filter((item) => item.status === 'claimed' || item.status === 'done')
      .filter((item) => {
        const claimedAt = item.claimedAt?.toDate?.() || null
        if (!windowStart || !claimedAt) {
          return false
        }
        return claimedAt >= windowStart
      }).length

    if (usedFamilyClaims >= familyLimitCount) {
      const readablePeriod = familyLimitPeriod === 'day' ? 'today' : 'this week'
      throw new Error(
        `This job is at its family limit (${familyLimitCount} per ${familyLimitPeriod}) ${readablePeriod}.`,
      )
    }
  }

  // Global pool jobs are limited to one active claim per child.
  if (!jobData.childId) {
    const activePoolClaimQuery = query(
      collection(db, 'families', targetFamilyId, 'jobs'),
      where('claimedBy', '==', userId),
      where('status', '==', 'claimed'),
      where('childId', '==', null),
      limit(1),
    )
    const activePoolClaimSnap = await getDocs(activePoolClaimQuery)
    if (!activePoolClaimSnap.empty) {
      throw new Error(
        'You already have a claimed pool task. Finish or submit it before claiming another.',
      )
    }
  }

  await updateDoc(jobRef, {
    status: 'claimed',
    claimedBy: userId,
    claimedAt: serverTimestamp(),
  })
}

export async function requestJobCheck(job, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(
    context,
  )

  if (userRole !== 'kid') {
    throw new Error('Only kids can request a job check.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  if (!job?.id) {
    throw new Error('Job ID is required for check request.')
  }

  const jobRef = doc(db, 'families', activeFamilyId, 'jobs', job.id)
  const jobSnap = await getDoc(jobRef)

  if (!jobSnap.exists()) {
    throw new Error('Job not found.')
  }

  const jobData = normalizeJob({ id: jobSnap.id, ...jobSnap.data() })
  if (jobData.status !== 'claimed') {
    throw new Error('Only claimed jobs can be submitted for check.')
  }

  if (jobData.claimedBy !== userId) {
    throw new Error('You can only request checks for your claimed jobs.')
  }

  try {
    const pendingQuery = query(
      collection(db, 'families', activeFamilyId, 'jobCheckRequests'),
      where('jobId', '==', job.id),
      where('status', '==', 'pending'),
      limit(1),
    )
    const pendingSnap = await getDocs(pendingQuery)
    if (!pendingSnap.empty) {
      throw new Error('A check request is already pending for this job.')
    }
  } catch (error) {
    if (error?.message === 'A check request is already pending for this job.') {
      throw error
    }
    // If query-read permission is restricted, continue and rely on create/write validation.
    if (error?.code !== 'permission-denied') {
      throw error
    }
  }

  try {
    await addDoc(collection(db, 'families', activeFamilyId, 'jobCheckRequests'), {
      jobId: job.id,
      childId: userId,
      jobTitle: jobData.title,
      points: Number(jobData.points) || 0,
      requestedBy: userId,
      status: 'pending',
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    if (error?.code === 'permission-denied') {
      throw new Error(
        'Permission denied creating job check request. Deploy the latest firestore.rules to include jobCheckRequests access.',
        { cause: error },
      )
    }
    throw error
  }
}

export async function getFamilyJobCheckRequests(context = {}) {
  const { familyId: activeFamilyId, userRole, userId } = getActiveFamilyContext(
    context,
  )
  const selectedChildId = context.selectedChildId || null

  if (!hasFirebaseConfig || !db) {
    return {
      source: 'empty',
      data: { requests: [] },
      context: { familyId: activeFamilyId, userId, userRole },
    }
  }

  let snapshot
  try {
    snapshot = await getDocs(collection(db, 'families', activeFamilyId, 'jobCheckRequests'))
  } catch (error) {
    if (error?.code === 'permission-denied') {
      return {
        source: 'empty',
        data: { requests: [] },
        context: { familyId: activeFamilyId, userId, userRole },
      }
    }
    throw error
  }

  const requests = snapshot.docs
    .map((item) => normalizeJobCheckRequest({ id: item.id, ...item.data() }, item.id))
    .filter((item) => (selectedChildId ? item.childId === selectedChildId : true))
    .sort((a, b) => {
      if (a.status === b.status) {
        return 0
      }
      return a.status === 'pending' ? -1 : 1
    })

  return {
    source: 'firestore',
    data: { requests },
    context: { familyId: activeFamilyId, userId, userRole },
  }
}

export async function reviewJobCheckRequest(requestId, decision, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(
    context,
  )

  if (userRole !== 'parent') {
    throw new Error('Only parents can review job checks.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  if (decision !== 'approved' && decision !== 'denied') {
    throw new Error('Decision must be approved or denied.')
  }

  const requestRef = doc(db, 'families', activeFamilyId, 'jobCheckRequests', requestId)
  const requestSnap = await getDoc(requestRef)

  if (!requestSnap.exists()) {
    throw new Error('Job check request not found.')
  }

  const requestData = normalizeJobCheckRequest(
    { id: requestSnap.id, ...requestSnap.data() },
    requestSnap.id,
  )

  if (requestData.status !== 'pending') {
    throw new Error('This check request has already been reviewed.')
  }

  await updateDoc(requestRef, {
    status: decision,
    reviewedBy: userId,
    reviewedAt: serverTimestamp(),
  })

  if (decision === 'approved') {
    const jobRef = doc(db, 'families', activeFamilyId, 'jobs', requestData.jobId)
    const jobSnap = await getDoc(jobRef)
    const approvedJob = jobSnap.exists()
      ? normalizeJob({ id: jobSnap.id, ...jobSnap.data() })
      : null

    await updateDoc(jobRef, {
      status: 'done',
      completedAt: serverTimestamp(),
    })

    const childRef = doc(db, 'families', activeFamilyId, 'children', requestData.childId)
    await updateDoc(childRef, {
      credits: increment(Number(requestData.points) || 0),
      updatedAt: serverTimestamp(),
    })

    if (approvedJob?.autoRecreate) {
      await addDoc(collection(db, 'families', activeFamilyId, 'jobs'), {
        title: approvedJob.title,
        points: Number(approvedJob.points) || 0,
        icon: approvedJob.icon || '✅',
        childId: approvedJob.childId || null,
        claimLimitCount: Number(approvedJob.claimLimitCount) || 0,
        claimLimitPeriod: approvedJob.claimLimitPeriod || null,
        familyClaimLimitCount: Number(approvedJob.familyClaimLimitCount) || 0,
        familyClaimLimitPeriod: approvedJob.familyClaimLimitPeriod || null,
        claimLimitKey: approvedJob.claimLimitKey || normalizeJobLimitKey(approvedJob.title),
        autoRecreate: true,
        status: 'open',
        order: Date.now(),
        claimedBy: null,
        createdBy: approvedJob.createdBy || userId,
        createdAt: serverTimestamp(),
      })
    }
  }
}

export async function getFamilyStoreData(context = {}) {
  const { familyId: activeFamilyId, userRole, userId } = getActiveFamilyContext(
    context,
  )
  const selectedChildId = context.selectedChildId || null

  if (!hasFirebaseConfig || !db) {
    return {
      source: 'empty',
      data: {
        rewards: [],
        requests: [],
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

  const allRequests = requestsSnapshot.docs
    .map((item) =>
      normalizeRewardRequest({ id: item.id, ...item.data() }, item.id),
    )

  const requests = allRequests
    .filter((request) =>
      selectedChildId
        ? !request.childId || request.childId === selectedChildId
        : true,
    )
    .sort((a, b) => {
      if (a.status === b.status) {
        return 0
      }
      return a.status === 'pending' ? -1 : 1
    })

  const rewardUsage = {}
  const dayStart = startOfCurrentWindow('day')
  const weekStart = startOfCurrentWindow('week')

  allRequests
    .filter((request) => request.status === 'pending' || request.status === 'approved')
    .forEach((request) => {
      const rewardId = request.rewardId
      if (!rewardId) {
        return
      }

      if (!rewardUsage[rewardId]) {
        rewardUsage[rewardId] = {
          familyDay: 0,
          familyWeek: 0,
          childDay: 0,
          childWeek: 0,
        }
      }

      const createdAt = request.createdAt?.toDate?.() || null
      if (!createdAt) {
        return
      }

      if (dayStart && createdAt >= dayStart) {
        rewardUsage[rewardId].familyDay += 1
        if (selectedChildId && request.requestedBy === selectedChildId) {
          rewardUsage[rewardId].childDay += 1
        }
      }

      if (weekStart && createdAt >= weekStart) {
        rewardUsage[rewardId].familyWeek += 1
        if (selectedChildId && request.requestedBy === selectedChildId) {
          rewardUsage[rewardId].childWeek += 1
        }
      }
    })

  const familySnap = await getDoc(doc(db, 'families', activeFamilyId))
  const pricingSettings = normalizeFamilyPricingSettings(familySnap.data() || {})

  const rewards = rewardsSnapshot.docs
    .map((item) => normalizeReward({ id: item.id, ...item.data() }, item.id))
    .map((reward) => {
      const pricing = calculateRewardAdjustedCost(reward, requests, pricingSettings)
      return {
        ...reward,
        cost: pricing.adjustedCost,
        pricingMeta: pricing.pricingMeta,
      }
    })
    .filter((reward) =>
      selectedChildId
        ? !reward.childId || reward.childId === selectedChildId
        : true,
    )
    .sort((a, b) => a.cost - b.cost)

  return {
    source: 'firestore',
    data: { rewards, requests, pricingSettings, rewardUsage },
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

  if (!reward?.id) {
    throw new Error('Reward ID is required.')
  }

  const rewardRef = doc(db, 'families', activeFamilyId, 'rewards', reward.id)
  const rewardSnap = await getDoc(rewardRef)

  if (!rewardSnap.exists()) {
    throw new Error('Reward not found.')
  }

  const rewardData = normalizeReward({ id: rewardSnap.id, ...rewardSnap.data() }, rewardSnap.id)

  const familySnap = await getDoc(doc(db, 'families', activeFamilyId))
  const pricingSettings = normalizeFamilyPricingSettings(familySnap.data() || {})

  const limitCount = Number(rewardData.claimLimitCount) || 0
  const limitPeriod = rewardData.claimLimitPeriod
  const familyLimitCount = Number(rewardData.familyClaimLimitCount) || 0
  const familyLimitPeriod = rewardData.familyClaimLimitPeriod
  const requestSnapshot = await getDocs(
    collection(db, 'families', activeFamilyId, 'rewardRequests'),
  )
  const allRewardRequests = requestSnapshot.docs
    .map((item) => normalizeRewardRequest({ id: item.id, ...item.data() }, item.id))

  const pricing = calculateRewardAdjustedCost(rewardData, allRewardRequests, pricingSettings)
  const effectiveCost = pricing.adjustedCost

  const targetChildId = context.selectedChildId || userId
  if (targetChildId) {
    const childRef = doc(db, 'families', activeFamilyId, 'children', targetChildId)
    const childSnap = await getDoc(childRef)

    if (childSnap.exists()) {
      const childCredits = Number(childSnap.data()?.credits) || 0
      if (childCredits < Number(effectiveCost || 0)) {
        const deficit = Number(effectiveCost || 0) - childCredits
        throw new Error(`Not enough credits. You need ${deficit} more credits.`)
      }
    }
  }

  if (rewardData.repeatMode === 'once') {
    const alreadyRequested = allRewardRequests
      .some(
        (item) =>
          item.rewardId === rewardData.id
          && item.requestedBy === userId
          && (item.status === 'pending' || item.status === 'approved'),
      )

    if (alreadyRequested) {
      throw new Error('This reward is one-time only and was already used.')
    }
  }

  if (familyLimitCount > 0 && familyLimitPeriod) {
    const windowStart = startOfCurrentWindow(familyLimitPeriod)

    const usedFamilyClaims = allRewardRequests
      .filter((item) => item.rewardId === rewardData.id)
      .filter((item) => item.status === 'pending' || item.status === 'approved')
      .filter((item) => {
        const createdAt = item.createdAt?.toDate?.() || null
        if (!windowStart || !createdAt) {
          return false
        }
        return createdAt >= windowStart
      }).length

    if (usedFamilyClaims >= familyLimitCount) {
      const readablePeriod = familyLimitPeriod === 'day' ? 'today' : 'this week'
      throw new Error(
        `This reward is at its family limit (${familyLimitCount} per ${familyLimitPeriod}) ${readablePeriod}.`,
      )
    }
  }

  if (limitCount > 0 && limitPeriod) {
    const windowStart = startOfCurrentWindow(limitPeriod)

    const usedClaims = allRewardRequests
      .filter((item) => item.rewardId === rewardData.id)
      .filter((item) => item.requestedBy === userId)
      .filter((item) => item.status === 'pending' || item.status === 'approved')
      .filter((item) => {
        const createdAt = item.createdAt?.toDate?.() || null
        if (!windowStart || !createdAt) {
          return false
        }
        return createdAt >= windowStart
      }).length

    if (usedClaims >= limitCount) {
      const readablePeriod = limitPeriod === 'day' ? 'today' : 'this week'
      throw new Error(
        `You already reached this reward limit (${limitCount} per ${limitPeriod}) ${readablePeriod}.`,
      )
    }
  }

  await addDoc(collection(db, 'families', activeFamilyId, 'rewardRequests'), {
    rewardId: rewardData.id,
    childId: rewardData.childId || context.selectedChildId || null,
    rewardTitle: rewardData.title,
    cost: Number(effectiveCost) || 0,
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
        jobs: [],
        rewards: [],
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
        jobs: [],
        rewards: [],
      },
      context: { familyId: activeFamilyId, userId, userRole },
    }
  }

  const childSnapshot = await getDocs(
    collection(db, 'families', activeFamilyId, 'children'),
  )
  const jobsSnapshot = await getDocs(collection(db, 'families', activeFamilyId, 'jobs'))
  const rewardsSnapshot = await getDocs(
    collection(db, 'families', activeFamilyId, 'rewards'),
  )

  const familyData = familySnap.data()

  return {
    source: 'firestore',
    data: {
      familyExists: true,
      family: {
        profileName: familyData.profileName || 'My Family',
        familyRules: familyData.familyRules || '',
        childSessionSecurityEnabled: Boolean(familyData.childSessionSecurityEnabled),
        ...normalizeFamilyPricingSettings(familyData),
      },
      childProfiles: childSnapshot.docs
        .map((item) => normalizeChildProfile({ id: item.id, ...item.data() }, item.id))
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
      jobs: jobsSnapshot.docs
        .map((item) => normalizeJob({ id: item.id, ...item.data() }))
        .sort((a, b) => (a.order || 0) - (b.order || 0)),
      rewards: rewardsSnapshot.docs
        .map((item) => normalizeReward({ id: item.id, ...item.data() }, item.id))
        .sort((a, b) => a.cost - b.cost),
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

  const familyRules = (household.familyRules || '').trim()

  await setDoc(
    doc(db, 'families', activeFamilyId),
    {
      profileName,
      familyRules,
      childSessionSecurityEnabled: Boolean(household.childSessionSecurityEnabled),
      dynamicPricingEnabled: Boolean(household.dynamicPricingEnabled),
      dynamicPricingWindowPeriod: normalizePricingWindow(household.dynamicPricingWindowPeriod),
      dynamicPricingDemandWeight: Math.max(0, Number(household.dynamicPricingDemandWeight) || 0),
      dynamicPricingScarcityWeight: Math.max(0, Number(household.dynamicPricingScarcityWeight) || 0),
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
    credits: 0,
    sessionCodeEnabled: false,
    sessionCode: '',
    allowChildSetSessionCode: false,
    createdBy: userId,
    createdAt: serverTimestamp(),
  })
}

export async function setChildSessionSecurity(enabled, context = {}) {
  const { familyId: activeFamilyId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent') {
    throw new Error('Only parents can update child session security.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  await setDoc(
    doc(db, 'families', activeFamilyId),
    {
      childSessionSecurityEnabled: Boolean(enabled),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function setChildAllowSessionCode(childId, allowed, context = {}) {
  const { familyId: activeFamilyId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent') {
    throw new Error('Only parents can update child session code policy.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  await updateDoc(doc(db, 'families', activeFamilyId, 'children', childId), {
    allowChildSetSessionCode: Boolean(allowed),
    updatedAt: serverTimestamp(),
  })
}

export async function setChildSessionCode(childId, sessionCode, context = {}) {
  const { familyId: activeFamilyId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent') {
    throw new Error('Only parents can update child session codes.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const trimmed = (sessionCode || '').trim()
  if (trimmed && !/^\d{4}$/.test(trimmed)) {
    throw new Error('Child session code must be exactly 4 digits.')
  }

  await updateDoc(doc(db, 'families', activeFamilyId, 'children', childId), {
    sessionCodeEnabled: Boolean(trimmed),
    sessionCode: trimmed,
    updatedAt: serverTimestamp(),
  })
}

export async function clearChildSessionCode(childId, context = {}) {
  const { familyId: activeFamilyId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent') {
    throw new Error('Only parents can clear child session codes.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  await updateDoc(doc(db, 'families', activeFamilyId, 'children', childId), {
    sessionCodeEnabled: false,
    sessionCode: '',
    updatedAt: serverTimestamp(),
  })
}

export async function createReward(rewardPayload, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(
    context,
  )

  if (userRole !== 'parent') {
    throw new Error('Only parents can create rewards.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const title = (rewardPayload.title || '').trim()
  if (!title) {
    throw new Error('Reward title is required.')
  }

  const cost = Number(rewardPayload.cost) || 0
  const claimLimitCount = Number(rewardPayload.claimLimitCount) || 0
  const claimLimitPeriod =
    rewardPayload.claimLimitPeriod === 'day' || rewardPayload.claimLimitPeriod === 'week'
      ? rewardPayload.claimLimitPeriod
      : null
  const familyClaimLimitCount = Number(rewardPayload.familyClaimLimitCount) || 0
  const familyClaimLimitPeriod =
    rewardPayload.familyClaimLimitPeriod === 'day' || rewardPayload.familyClaimLimitPeriod === 'week'
      ? rewardPayload.familyClaimLimitPeriod
      : null
  const repeatMode = rewardPayload.repeatMode === 'once' ? 'once' : 'recur'

  await addDoc(collection(db, 'families', activeFamilyId, 'rewards'), {
    title,
    cost,
    baseCost: cost,
    childId: rewardPayload.childId || null,
    repeatMode,
    claimLimitCount,
    claimLimitPeriod: claimLimitCount > 0 ? claimLimitPeriod || 'day' : null,
    familyClaimLimitCount,
    familyClaimLimitPeriod:
      familyClaimLimitCount > 0 ? familyClaimLimitPeriod || 'day' : null,
    requiresApproval: true,
    createdBy: userId,
    createdAt: serverTimestamp(),
  })
}

export async function updateReward(rewardId, rewardPayload, context = {}) {
  const { familyId: activeFamilyId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent') {
    throw new Error('Only parents can update rewards.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const title = (rewardPayload.title || '').trim()
  if (!title) {
    throw new Error('Reward title is required.')
  }

  const cost = Number(rewardPayload.cost) || 0
  const claimLimitCount = Number(rewardPayload.claimLimitCount) || 0
  const claimLimitPeriod =
    rewardPayload.claimLimitPeriod === 'day' || rewardPayload.claimLimitPeriod === 'week'
      ? rewardPayload.claimLimitPeriod
      : null
  const familyClaimLimitCount = Number(rewardPayload.familyClaimLimitCount) || 0
  const familyClaimLimitPeriod =
    rewardPayload.familyClaimLimitPeriod === 'day' || rewardPayload.familyClaimLimitPeriod === 'week'
      ? rewardPayload.familyClaimLimitPeriod
      : null
  const repeatMode = rewardPayload.repeatMode === 'once' ? 'once' : 'recur'

  await updateDoc(doc(db, 'families', activeFamilyId, 'rewards', rewardId), {
    title,
    cost,
    baseCost: cost,
    childId: rewardPayload.childId || null,
    repeatMode,
    claimLimitCount,
    claimLimitPeriod: claimLimitCount > 0 ? claimLimitPeriod || 'day' : null,
    familyClaimLimitCount,
    familyClaimLimitPeriod:
      familyClaimLimitCount > 0 ? familyClaimLimitPeriod || 'day' : null,
    updatedAt: serverTimestamp(),
  })
}

export async function createGoal(goalPayload, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(
    context,
  )

  if (userRole !== 'parent') {
    throw new Error('Only parents can create savings goals.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const name = (goalPayload.name || '').trim()
  if (!name) {
    throw new Error('Goal name is required.')
  }

  const target = Number(goalPayload.target)
  if (!Number.isFinite(target) || target <= 0) {
    throw new Error('Goal target must be greater than zero.')
  }

  const childId = goalPayload.childId || null
  if (childId) {
    const existingChildGoalQuery = query(
      collection(db, 'families', activeFamilyId, 'goals'),
      where('childId', '==', childId),
      limit(1),
    )
    const existingChildGoalSnap = await getDocs(existingChildGoalQuery)
    if (!existingChildGoalSnap.empty) {
      throw new Error('Only one savings goal can be active at a time for this child.')
    }
  }

  await addDoc(collection(db, 'families', activeFamilyId, 'goals'), {
    name,
    childId,
    target,
    saved: Number(goalPayload.saved) || 0,
    createdBy: userId,
    createdAt: serverTimestamp(),
  })
}

export async function updateGoal(goalId, goalPayload, context = {}) {
  const { familyId: activeFamilyId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent') {
    throw new Error('Only parents can update savings goals.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const name = (goalPayload.name || '').trim()
  if (!name) {
    throw new Error('Goal name is required.')
  }

  const target = Number(goalPayload.target)
  if (!Number.isFinite(target) || target <= 0) {
    throw new Error('Goal target must be greater than zero.')
  }

  const childId = goalPayload.childId || null
  if (childId) {
    const existingChildGoalQuery = query(
      collection(db, 'families', activeFamilyId, 'goals'),
      where('childId', '==', childId),
    )
    const existingChildGoalSnap = await getDocs(existingChildGoalQuery)
    const conflict = existingChildGoalSnap.docs.some((item) => item.id !== goalId)
    if (conflict) {
      throw new Error('Only one savings goal can be active at a time for this child.')
    }
  }

  await updateDoc(doc(db, 'families', activeFamilyId, 'goals', goalId), {
    name,
    target,
    childId,
    updatedAt: serverTimestamp(),
  })
}
