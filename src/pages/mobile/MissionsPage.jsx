import JobsCard from '../../components/mobile/cards/MissionsCard'
import FamilyActorNotice from '../../components/shared/FamilyActorNotice'
import StatusNote from '../../components/shared/StatusNote'
import useAsyncAction from '../../hooks/useAsyncAction'
import useFamilyDashboard from '../../hooks/useFamilyDashboard'
import { useClaimJobMutation } from '../../store/familyEconomyApi'

export default function JobsPage() {
  const {
    familyId,
    effectiveUserId,
    effectiveRole,
    selectedChildId,
    jobs,
    loading,
    error,
  } = useFamilyDashboard()
  const claimAction = useAsyncAction({ defaultErrorMessage: 'Could not claim job.' })
  const [claimJobMutation] = useClaimJobMutation()

  async function handleClaimJob(job) {
    if (!job.id) {
      claimAction.setError('This job cannot be claimed because it has no document id.')
      return
    }

    await claimAction.run(async () => {
      await claimJobMutation({
        jobId: job.id,
        context: {
          familyId,
          userId: effectiveUserId,
          userRole: effectiveRole,
          selectedChildId,
        },
      })
        .unwrap()
    }, {
      busyKey: job.id,
      errorMessage: 'Could not claim job.',
    })
  }

  return (
    <>
      <main className="phone-content">
        <StatusNote>{loading ? 'Loading jobs...' : ''}</StatusNote>
        <StatusNote tone="error">{error || claimAction.error}</StatusNote>

        <FamilyActorNotice selectionMessage="Choose a child in Kids tab to view child-specific jobs." />

        <JobsCard
          jobs={jobs}
          userRole={effectiveRole}
          currentUserId={effectiveUserId}
          onClaimJob={handleClaimJob}
          claimingJobId={claimAction.busyKey}
        />
      </main>
    </>
  )
}
