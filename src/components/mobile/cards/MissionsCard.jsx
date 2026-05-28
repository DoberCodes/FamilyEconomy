export default function MissionsCard({
  jobs,
  userRole,
  currentUserId,
  onClaimJob,
  claimingJobId,
}) {
  function statusLabel(job) {
    if (job.status === 'done') {
      return 'Done'
    }

    if (job.status === 'claimed') {
      return job.claimedBy === currentUserId ? 'Claimed by you' : 'Claimed'
    }

    return 'Open'
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <p className="panel-label">Today&apos;s Jobs</p>
        <button type="button" className="text-button">
          View all
        </button>
      </div>
      <ul className="mission-list">
        {jobs.map((job) => (
          <li key={job.id || job.title}>
            <span className="mission-main">
              <em aria-hidden="true">{job.icon}</em>
              {job.title}
            </span>
            <span className="mission-reward">+ {job.points}</span>
            {userRole === 'kid' && job.status === 'open' && onClaimJob ? (
              <button
                type="button"
                className="claim-button"
                onClick={() => onClaimJob(job)}
                disabled={claimingJobId === job.id}
              >
                {claimingJobId === job.id ? 'Claiming...' : 'Claim'}
              </button>
            ) : (
              <span className="job-status-label">{statusLabel(job)}</span>
            )}

            <span
              className={job.status === 'done' ? 'status-dot status-done' : 'status-dot'}
              aria-label={job.status === 'done' ? 'Done' : 'Pending'}
            >
              {job.status === 'done' ? '✓' : ''}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
