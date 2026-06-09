import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomBytes } from 'node:crypto'

import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

loadDotEnv()

const args = parseArgs(process.argv.slice(2))
const projectId = env('DEMO_FIREBASE_PROJECT_ID') || env('VITE_FIREBASE_PROJECT_ID') || env('FIREBASE_PROJECT_ID')
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

function parseArgs(rawArgs) {
  const parsed = {}

  for (let index = 0; index < rawArgs.length; index += 1) {
    const value = rawArgs[index]

    if (!value.startsWith('--')) {
      continue
    }

    const key = value.slice(2)
    const next = rawArgs[index + 1]

    if (!next || next.startsWith('--')) {
      parsed[key] = true
    } else {
      parsed[key] = next
      index += 1
    }
  }

  return parsed
}

function generateInviteCode() {
  return `FE-${randomBytes(3).toString('hex').toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`
}

function normalizeInviteCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

function env(name) {
  return process.env[name]
}

function loadDotEnv() {
  const envPath = resolve(process.cwd(), '.env')

  if (!existsSync(envPath)) {
    return
  }

  const contents = readFileSync(envPath, 'utf8')
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue
    }

    const separatorIndex = trimmed.indexOf('=')
    const key = trimmed.slice(0, separatorIndex).trim()
    const rawValue = trimmed.slice(separatorIndex + 1).trim()
    const value = rawValue.replace(/^['"]|['"]$/g, '')

    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

function loadServiceAccount() {
  const serviceAccountPath = env('FIREBASE_SERVICE_ACCOUNT_PATH')
  const serviceAccountJson = env('FIREBASE_SERVICE_ACCOUNT_JSON')

  if (serviceAccountPath) {
    const resolvedPath = resolve(process.cwd(), serviceAccountPath)
    return JSON.parse(readFileSync(resolvedPath, 'utf8'))
  }

  if (serviceAccountJson) {
    return JSON.parse(serviceAccountJson)
  }

  throw new Error('Set FIREBASE_SERVICE_ACCOUNT_PATH before creating invite codes. FIREBASE_SERVICE_ACCOUNT_JSON is available for CI only.')
}
