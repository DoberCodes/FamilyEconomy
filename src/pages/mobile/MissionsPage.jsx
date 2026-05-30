import { useEffect, useState } from 'react'

import JobsCard from '../../components/mobile/cards/MissionsCard'
import { useAuth } from '../../context/AuthContext'
import {
  claimJob,
  getFamilyDashboard,
} from '../../services/familyEconomyService'

export default function JobsPage() {
  const {
    familyId,
    userId,
    userRole,
    activeChildProfile,
  } = useAuth()
  const effectiveRole = userRole || 'kid'
  const effectiveUserId = userId || 'kid-device'
  const [jobs, setJobs] = useState([])
  const [claimingJobId, setClaimingJobId] = useState('')
  const [error, setError] = useState('')

  async function refreshJobs() {
    const result = await getFamilyDashboard({
      familyId,
      userId,
      userRole,
      selectedChildId: activeChildProfile?.id,
    })
    setJobs(result.data.jobs)
  }

  useEffect(() => {
    let mounted = true

    async function loadJobs() {
      try {
        const result = await getFamilyDashboard({
          familyId,
          userId,
          userRole,
          selectedChildId: activeChildProfile?.id,
        })
        if (mounted) {
          setJobs(result.data.jobs)
        }
      } catch {
        if (mounted) {
          setJobs([])
        }
      }
    }

    loadJobs()

    return () => {
      mounted = false
    }
  }, [familyId, userId, userRole, activeChildProfile?.id])

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
      <main className="phone-content">
        {effectiveRole === 'parent' && activeChildProfile ? (
          <p className="status-note">
            Kid-friendly view child: {activeChildProfile.avatar} {activeChildProfile.displayName}
          </p>
        ) : null}

        {effectiveRole === 'parent' && !activeChildProfile ? (
          <p className="status-note">Choose a child in Kids tab to view child-specific jobs.</p>
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
    </>
  )
}
