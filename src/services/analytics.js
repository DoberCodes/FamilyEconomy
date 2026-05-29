import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore'

import { db, hasFirebaseConfig } from '../lib/firebase.js'

function getAnalyticsTarget() {
  if (typeof window === 'undefined') {
    return null
  }

  return window
}

function buildStorageKey(eventName, familyId, userId, childId) {
  return [eventName, familyId || '', userId || '', childId || ''].join(':')
}

const ANALYTICS_EVENTS_COLLECTION = 'analyticsEvents'

const MEANINGFUL_EVENT_NAMES = new Set([
  'onboarding_started',
  'onboarding_household_created',
  'onboarding_child_created',
  'onboarding_job_created',
  'onboarding_reward_created',
  'onboarding_completed',
  'family_dashboard_viewed',
  'job_claimed',
  'job_check_requested',
  'reward_request_submitted',
  'goal_milestone_reached',
  'statement_viewed',
  'child_dashboard_viewed',
])

async function persistAnalyticsEvent(event) {
  if (!hasFirebaseConfig || !db || !MEANINGFUL_EVENT_NAMES.has(event.eventName)) {
    return
  }

  await addDoc(collection(db, ANALYTICS_EVENTS_COLLECTION), {
    ...event,
    createdBy: event.userId || null,
    eventTimestamp: Date.now(),
    createdAt: serverTimestamp(),
  })
}

async function readAnalyticsEvents(days) {
  if (!hasFirebaseConfig || !db) {
    return []
  }

  const cutoff = Date.now() - (Math.max(1, Number(days) || 7) * 24 * 60 * 60 * 1000)
  const snapshot = await getDocs(
    query(
      collection(db, ANALYTICS_EVENTS_COLLECTION),
      where('eventTimestamp', '>=', cutoff),
    ),
  )

  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

export async function getWeeklyActiveFamilySummary({ days = 7 } = {}) {
  const events = await readAnalyticsEvents(days)
  const familyMap = new Map()

  events.forEach((event) => {
    if (!event.familyId) {
      return
    }

    const current = familyMap.get(event.familyId) || { familyId: event.familyId, eventCount: 0 }
    current.eventCount += 1
    familyMap.set(event.familyId, current)
  })

  const families = Array.from(familyMap.values()).sort((left, right) => right.eventCount - left.eventCount)

  return {
    windowDays: days,
    activeFamilyCount: families.length,
    totalEventCount: events.length,
    families,
  }
}

export async function exportWeeklyActiveFamilySummary(options = {}) {
  return JSON.stringify(await getWeeklyActiveFamilySummary(options), null, 2)
}

export async function getOnboardingCompletionSummary({ days = 30 } = {}) {
  const events = await readAnalyticsEvents(days)

  const startedFamilies = new Set()
  const completedFamilies = new Set()

  events.forEach((event) => {
    if (!event.familyId) {
      return
    }

    if (event.eventName === 'onboarding_started') {
      startedFamilies.add(event.familyId)
    }

    if (event.eventName === 'onboarding_completed') {
      completedFamilies.add(event.familyId)
    }
  })

  const startedFamilyCount = startedFamilies.size
  const completedFamilyCount = completedFamilies.size
  const completionRate = startedFamilyCount > 0
    ? Math.round((completedFamilyCount / startedFamilyCount) * 100)
    : 0

  return {
    windowDays: days,
    startedFamilyCount,
    completedFamilyCount,
    completionRate,
    startedFamilies: Array.from(startedFamilies),
    completedFamilies: Array.from(completedFamilies),
  }
}

export async function exportOnboardingCompletionSummary(options = {}) {
  return JSON.stringify(await getOnboardingCompletionSummary(options), null, 2)
}

export function trackAnalyticsEvent(eventName, payload = {}, context = {}, options = {}) {
  if (!eventName) {
    return null
  }

  const target = getAnalyticsTarget()
  if (!target) {
    return null
  }

  try {
    const event = {
      eventName,
      timestamp: new Date().toISOString(),
      familyId: context.familyId || null,
      userId: context.userId || null,
      userRole: context.userRole || null,
      childId: context.childId || payload.childId || null,
      screen: payload.screen || null,
      source: payload.source || null,
      ...payload,
    }

    if (options.dedupe) {
      const storageKey = options.dedupeKey || buildStorageKey(
        eventName,
        event.familyId,
        event.userId,
        event.childId,
      )

      try {
        if (window.localStorage.getItem(storageKey)) {
          return event
        }
        window.localStorage.setItem(storageKey, '1')
      } catch (storageError) {
        void storageError
      }
    }

    if (Array.isArray(target.dataLayer)) {
      target.dataLayer.push(event)
    } else if (typeof target.CustomEvent === 'function' && typeof target.dispatchEvent === 'function') {
      target.dispatchEvent(new CustomEvent('family-economy-analytics', { detail: event }))
    }

    void persistAnalyticsEvent(event).catch((error) => {
      void error
    })

    return event
  } catch (caughtError) {
    void caughtError
    return null
  }
}