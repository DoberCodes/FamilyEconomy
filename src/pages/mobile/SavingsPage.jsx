import EmptyState from '../../components/shared/EmptyState'
import FamilyActorNotice from '../../components/shared/FamilyActorNotice'
import ProgressTrack from '../../components/shared/ProgressTrack'
import StatusNote from '../../components/shared/StatusNote'
import StatusPill from '../../components/shared/StatusPill'
import { getGoalStatusLabel as displayGoalStatus } from '../../domain/familyEconomyTypes'
import useFamilyDashboard from '../../hooks/useFamilyDashboard'
import {
  getRemainingGoalCredits,
  getSavingsGoalSummary,
  getGoalProgressPercent,
} from '../../services/dashboardSelectors'

export default function SavingsPage() {
  const {
    goals,
    loading,
    error,
  } = useFamilyDashboard()

  const {
    goalCounts,
    sortedGoals,
    spotlightGoal,
    spotlightGoalPct,
  } = getSavingsGoalSummary(goals)

  return (
    <>
      <main className="phone-content">
        <StatusNote>{loading ? 'Loading savings goals...' : ''}</StatusNote>
        <StatusNote tone="error">{error}</StatusNote>

        <FamilyActorNotice selectionMessage="Choose a child in Kids tab before adding savings goals." />

        <section className="panel">
          <p className="panel-label">Savings Goals</p>
          <div className="limit-chip-row">
            <StatusPill>Active: {goalCounts.active || 0}</StatusPill>
            <StatusPill>Ready: {goalCounts.ready_to_claim || 0}</StatusPill>
            <StatusPill>Pending: {goalCounts.pending_parent_approval || 0}</StatusPill>
            <StatusPill>Completed: {goalCounts.completed || 0}</StatusPill>
          </div>
          {spotlightGoal ? (
            <div className="money-block" style={{ marginTop: '0.6rem' }}>
              <p className="panel-label money-section-title">Goal Spotlight</p>
              <p className="panel-muted">{spotlightGoal.rewardTitle || spotlightGoal.name}</p>
              <div className="limit-chip-row">
                <StatusPill>{displayGoalStatus(spotlightGoal.status)}</StatusPill>
                <StatusPill>{spotlightGoal.saved}/{spotlightGoal.target} credits</StatusPill>
                <StatusPill>{getRemainingGoalCredits(spotlightGoal)} to go</StatusPill>
              </div>
              <ProgressTrack value={spotlightGoalPct} light label="Goal spotlight progress" />
            </div>
          ) : null}
          {goals.length === 0 ? (
            <EmptyState>No savings goals yet. Add some after onboarding.</EmptyState>
          ) : (
            <ul className="goal-list-simple">
              {sortedGoals.map((goal) => {
                const pct = getGoalProgressPercent(goal)
                return (
                  <li key={goal.id || goal.name}>
                    <p>{goal.name}</p>
                    <small>
                      {goal.saved}/{goal.target} • {displayGoalStatus(goal.status)}
                    </small>
                    <ProgressTrack value={pct} light label={`${goal.name || 'Goal'} progress`} />
                  </li>
                )
              })}
            </ul>
          )}
        </section>

      </main>
    </>
  )
}
