import { doc, getDocFromServer, runTransaction, serverTimestamp } from 'firebase/firestore'

import { db } from '../lib/firebase'

export function normalizeInviteCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

export function isUsableInvite(inviteData) {
  if (!inviteData || inviteData.active !== true || inviteData.status !== 'active') {
    return false
  }

  const usedCount = Number(inviteData.usedCount) || 0
  const maxUses = Number(inviteData.maxUses) || 0
  const expiresAt = typeof inviteData.expiresAt?.toDate === 'function'
    ? inviteData.expiresAt.toDate()
    : new Date(inviteData.expiresAt || 0)

  return maxUses > 0 && usedCount < maxUses && expiresAt.getTime() > Date.now()
}

export async function validateRegistrationInvite(invitationCode) {
  if (!db) {
    throw new Error('Firebase Firestore is not configured.')
  }

  const normalizedInviteCode = normalizeInviteCode(invitationCode)

  if (!normalizedInviteCode) {
    throw new Error('Use an invitation link or enter your invitation code first.')
  }

  if (!/^[A-Z0-9-]{4,64}$/.test(normalizedInviteCode)) {
    throw new Error('Invitation code format is not valid.')
  }

  let inviteSnap

  try {
    inviteSnap = await getDocFromServer(doc(db, 'registrationInvites', normalizedInviteCode))
  } catch (caughtError) {
    if (caughtError?.code === 'permission-denied') {
      throw new Error('Could not validate that invitation code. It may be missing, expired, used up, or Firestore rules may not be deployed.')
    }

    throw new Error('That invitation code could not be checked right now.')
  }

  if (!inviteSnap.exists() || !isUsableInvite(inviteSnap.data())) {
    throw new Error('That invitation code is not active.')
  }

  return normalizedInviteCode
}

export async function consumeRegistrationInvite(invitationCode, uid) {
  if (!db) {
    throw new Error('Firebase Firestore is not configured.')
  }

  const normalizedInviteCode = normalizeInviteCode(invitationCode)
  const inviteRef = doc(db, 'registrationInvites', normalizedInviteCode)

  await runTransaction(db, async (transaction) => {
    const inviteSnap = await transaction.get(inviteRef)

    if (!inviteSnap.exists() || !isUsableInvite(inviteSnap.data())) {
      throw new Error('That invitation code is no longer available.')
    }

    const inviteData = inviteSnap.data()
    transaction.update(inviteRef, {
      usedCount: (Number(inviteData.usedCount) || 0) + 1,
      lastUsedAt: serverTimestamp(),
      lastUsedBy: uid,
      updatedAt: serverTimestamp(),
    })
  })
}
