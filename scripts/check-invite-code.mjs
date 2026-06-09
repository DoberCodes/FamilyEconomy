import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

import {
  getProjectId,
  loadDotEnv,
  loadServiceAccount,
  normalizeInviteCode,
  parseArgs,
} from './invite-utils.mjs'

loadDotEnv()

const args = parseArgs(process.argv.slice(2))
const projectId = getProjectId()
const code = normalizeInviteCode(args.code)

if (!projectId) {
  throw new Error('Set VITE_FIREBASE_PROJECT_ID, FIREBASE_PROJECT_ID, or DEMO_FIREBASE_PROJECT_ID before checking invite codes.')
}

if (!code) {
  throw new Error('Pass --code INVITE-CODE.')
}

initializeApp({
  credential: cert(loadServiceAccount()),
  projectId,
})

const db = getFirestore()
const inviteSnap = await db.collection('registrationInvites').doc(code).get()

console.log(`Project: ${projectId}`)
console.log(`Code:    ${code}`)

if (!inviteSnap.exists) {
  console.log('Status:  missing')
  console.log(`Fix:     create registrationInvites/${code} in this Firebase project.`)
  process.exitCode = 1
} else {
  const data = inviteSnap.data()
  const active = data.active === true
  const activeStatus = data.status === 'active'
  const usedCount = Number(data.usedCount) || 0
  const maxUses = Number(data.maxUses) || 0
  const expiresAt = typeof data.expiresAt?.toDate === 'function'
    ? data.expiresAt.toDate()
    : new Date(data.expiresAt || 0)
  const unexpired = expiresAt.getTime() > Date.now()
  const underUseLimit = maxUses > 0 && usedCount < maxUses
  const usable = active && activeStatus && unexpired && underUseLimit

  console.log(`Status:  ${usable ? 'usable' : 'not usable'}`)
  console.log(`active:  ${String(data.active)} ${active ? '' : '(must be true)'}`)
  console.log(`status:  ${String(data.status)} ${activeStatus ? '' : '(must be active)'}`)
  console.log(`uses:    ${usedCount} / ${maxUses} ${underUseLimit ? '' : '(used up or invalid maxUses)'}`)
  console.log(`expires: ${Number.isNaN(expiresAt.getTime()) ? 'invalid' : expiresAt.toISOString()} ${unexpired ? '' : '(expired)'}`)

  if (!usable) {
    process.exitCode = 1
  }
}
