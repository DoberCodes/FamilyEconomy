import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export function parseArgs(rawArgs) {
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

export function normalizeInviteCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

export function env(name) {
  return process.env[name]
}

export function loadDotEnv() {
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

export function loadServiceAccount() {
  const serviceAccountPath = env('FIREBASE_SERVICE_ACCOUNT_PATH')
  const serviceAccountJson = env('FIREBASE_SERVICE_ACCOUNT_JSON')

  if (serviceAccountPath) {
    const resolvedPath = resolve(process.cwd(), serviceAccountPath)
    return JSON.parse(readFileSync(resolvedPath, 'utf8'))
  }

  if (serviceAccountJson) {
    return JSON.parse(serviceAccountJson)
  }

  throw new Error('Set FIREBASE_SERVICE_ACCOUNT_PATH before managing invite codes. FIREBASE_SERVICE_ACCOUNT_JSON is available for CI only.')
}

export function getProjectId() {
  return env('DEMO_FIREBASE_PROJECT_ID') || env('VITE_FIREBASE_PROJECT_ID') || env('FIREBASE_PROJECT_ID')
}
