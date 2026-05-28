import { useEffect, useState } from 'react'

import BottomTabBar from '../../components/mobile/BottomTabBar'
import JobsCard from '../../components/mobile/cards/MissionsCard'
import { useAuth } from '../../context/AuthContext'
import { seedDashboard } from '../../data/mobileData'
import {
  claimJob,
  createJob,
  getFamilyDashboard,
} from '../../services/familyEconomyService'

export default function JobsPage() {
  const { familyId, userId, userRole, parentControlsUnlocked } = useAuth()
  const effectiveRole = userRole || 'kid'
  const effectiveUserId = userId || 'kid-device'
  const [jobs, setJobs] = useState(seedDashboard.jobs)
  const [title, setTitle] = useState('')
  const [points, setPoints] = useState(50)
  const [claimingJobId, setClaimingJobId] = useState('')
  const [savingJob, setSavingJob] = useState(false)
  const [error, setError] = useState('')

  async function refreshJobs() {
    const result = await getFamilyDashboard({ familyId, userId, userRole })
    setJobs(result.data.jobs)
  }

  useEffect(() => {
    let mounted = true

    async function loadJobs() {
      try {
        const result = await getFamilyDashboard({ familyId, userId, userRole })
        if (mounted) {
          setJobs(result.data.jobs)
        }
      } catch {
        if (mounted) {
          setJobs(seedDashboard.jobs)
        }
      }
    }

    loadJobs()

    return () => {
      mounted = false
    }
  }, [familyId, userId, userRole])

  async function handleCreateJob(event) {
    event.preventDefault()
    setError('')
    setSavingJob(true)

    try {
      await createJob(
        { title, points },
        { familyId, userId: effectiveUserId, userRole: effectiveRole },
      )
      setTitle('')
      setPoints(50)
      await refreshJobs()
    } catch (caughtError) {
      setError(caughtError.message || 'Could not create job.')
    } finally {
      setSavingJob(false)
    }
  }

  async function handleClaimJob(job) {
    if (!job.id) {
      setError('This job cannot be claimed because it has no document id.')
      return
    }

    setError('')
    setClaimingJobId(job.id)

    try {
      await claimJob(job.id, {
        familyId,
        userId: effectiveUserId,
        userRole: effectiveRole,
      })
      await refreshJobs()
    } catch (caughtError) {
      setError(caughtError.message || 'Could not claim job.')
    } finally {
      setClaimingJobId('')
    }
  }

  return (
    <>
      <header className="status-row">
        <span>9:41</span>
        <span className="page-title">Jobs</span>
      </header>
      <main className="phone-content">
        {effectiveRole === 'parent' && parentControlsUnlocked ? (
          <section className="panel">
            <p className="panel-label">Create Job</p>
            <form className="job-form" onSubmit={handleCreateJob}>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="job-input"
                placeholder="Job title"
                required
              />
              <input
                value={points}
                onChange={(event) => setPoints(Number(event.target.value) || 0)}
                className="job-input"
                type="number"
                min="1"
                placeholder="Points"
                required
              />
              <button type="submit" className="claim-button" disabled={savingJob}>
                {savingJob ? 'Saving...' : 'Add Job'}
              </button>
            </form>
          </section>
        ) : null}

        {effectiveRole === 'parent' && !parentControlsUnlocked ? (
          <p className="status-note">
            Parent controls are locked. Unlock from Profile with Parent PIN.
          </p>
        ) : null}

        {error ? <p className="status-note status-error">{error}</p> : null}

        <JobsCard
          jobs={jobs}
          userRole={effectiveRole}
          currentUserId={effectiveUserId}
          onClaimJob={handleClaimJob}
          claimingJobId={claimingJobId}
        />
      </main>
      <BottomTabBar />
    </>
  )
}
