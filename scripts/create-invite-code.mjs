import { randomBytes } from 'node:crypto'

import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

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
const code = normalizeInviteCode(args.code || generateInviteCode())
const maxUses = Math.max(1, Number(args.maxUses || args['max-uses'] || 1))
const days = Math.max(1, Number(args.days || 30))
const note = String(args.note || '').trim()
const force = Boolean(args.force)

if (!projectId) {
  throw new Error('Set VITE_FIREBASE_PROJECT_ID, FIREBASE_PROJECT_ID, or DEMO_FIREBASE_PROJECT_ID before creating invite codes.')
}

if (!/^[A-Z0-9-]{4,64}$/.test(code)) {
  throw new Error('Invite code must use 4-64 characters: A-Z, 0-9, or hyphen.')
}

initializeApp({
  credential: cert(loadServiceAccount()),
  projectId,
})

const db = getFirestore()
const inviteRef = db.collection('registrationInvites').doc(code)
const existing = await inviteRef.get()

if (existing.exists && !force) {
  throw new Error(`Invite code ${code} already exists. Pass --force to replace it.`)
}

const now = Timestamp.now()
const expiresAt = Timestamp.fromDate(new Date(Date.now() + days * 24 * 60 * 60 * 1000))

await inviteRef.set({
  code,
  active: true,
  status: 'active',
  maxUses,
  usedCount: 0,
  expiresAt,
  createdAt: now,
  updatedAt: now,
  createdBy: 'scripts/create-invite-code.mjs',
  note,
})

console.log(`Invite code created: ${code}`)
console.log(`Max uses: ${maxUses}`)
console.log(`Expires: ${expiresAt.toDate().toISOString()}`)
console.log(`Invite URL path: /auth?invite=${encodeURIComponent(code)}`)
console.log(`GitHub Pages invite path: /FamilyEconomy/#/auth?invite=${encodeURIComponent(code)}`)
console.log('Code-entry URL path: /auth?invite')
console.log('GitHub Pages code-entry path: /FamilyEconomy/#/auth?invite')

function generateInviteCode() {
  return `FE-${randomBytes(3).toString('hex').toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`
}
