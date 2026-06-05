import EmptyState from '../../components/shared/EmptyState'
import FamilyActorNotice from '../../components/shared/FamilyActorNotice'
import StatusNote from '../../components/shared/StatusNote'
import StatusPill from '../../components/shared/StatusPill'
import { getRewardRequestStatusLabel } from '../../domain/familyEconomyTypes'
import useAsyncAction from '../../hooks/useAsyncAction'
import useFamilyStoreData from '../../hooks/useFamilyStoreData'
import { useRequestRewardMutation } from '../../store/familyEconomyApi'

export default function StorePage() {
  const {
    familyId,
    effectiveUserId,
    effectiveRole,
    selectedChildId,
    rewards,
    requests,
    fundTaxSettings,
    loading,
    error,
  } = useFamilyStoreData()
  const requestAction = useAsyncAction({ defaultErrorMessage: 'Could not submit reward request.' })
  const [requestRewardMutation] = useRequestRewardMutation()

  async function handleRequestReward(reward) {
    await requestAction.run(async () => {
      await requestRewardMutation({
        reward,
        context: {
          familyId,
          userId: effectiveUserId,
          userRole: effectiveRole,
          selectedChildId,
        },
      })
        .unwrap()
    }, {
      busyKey: reward.id,
      errorMessage: 'Could not submit reward request.',
    })
  }

  function getSalesTaxAmount(costValue) {
    const baseCost = Math.max(0, Number(costValue) || 0)
    const taxEnabled =
      fundTaxSettings.familyFundEnabled !== false
      && Boolean(fundTaxSettings.familyFundSalesTaxEnabled)
    const taxPercent = Math.max(0, Number(fundTaxSettings.familyFundSalesTaxPercent) || 0)

    if (!taxEnabled || taxPercent <= 0 || baseCost <= 0) {
      return 0
    }

    return Math.round(baseCost * (taxPercent / 100))
  }

  return (
    <>
      <main className="phone-content">
        <StatusNote>{loading ? 'Loading store...' : ''}</StatusNote>
        <StatusNote tone="error">{error || requestAction.error}</StatusNote>

        <FamilyActorNotice selectionMessage="Choose a child in Kids tab to view child-specific rewards." />

        <section className="panel">
          <p className="panel-label">Rewards Store</p>
          <ul className="mission-list">
            {rewards.map((reward) => (
              <li key={reward.id}>
                {(() => {
                  const salesTaxAmount = getSalesTaxAmount(reward.cost)
                  const totalCost = (Number(reward.cost) || 0) + salesTaxAmount
                  return (
                    <>
                <span className="mission-main">🎁 {reward.title}</span>
                {salesTaxAmount > 0 ? (
                  <div className="job-status-label" style={{ display: 'grid', gap: '0.1rem' }}>
                    <span>Base: {reward.cost} credits</span>
                    <span>Contribution: {salesTaxAmount} credits</span>
                    <span className="mission-reward" style={{ fontSize: '1rem', lineHeight: 1.1 }}>
                      Total: {totalCost} credits
                    </span>
                  </div>
                ) : (
                  <span className="mission-reward">{totalCost}</span>
                )}
                {reward.pricingMeta?.dynamicPricingApplied ? (
                  <span className="job-status-label">
                    Base {reward.pricingMeta.baseCost} -&gt; Now {reward.pricingMeta.adjustedCost} -&gt; Next est {reward.pricingMeta.projectedNextCost}
                  </span>
                ) : null}
                {effectiveRole === 'kid' ? (
                  <button
                    type="button"
                    className="claim-button"
                    onClick={() => handleRequestReward(reward)}
                    disabled={requestAction.busyKey === reward.id}
                  >
                    {requestAction.busyKey === reward.id ? 'Sending...' : 'Request'}
                  </button>
                ) : (
                  <span className="job-status-label">Requests are managed in Parent tab</span>
                )}
                    </>
                  )
                })()}
              </li>
            ))}
          </ul>
        </section>

        {effectiveRole !== 'parent' ? (
          <section className="panel">
            <p className="panel-label">My Reward Requests</p>
            {requests.length === 0 ? (
              <EmptyState>No requests yet.</EmptyState>
            ) : (
              <ul className="mission-list">
                {requests
                  .filter((item) => item.requestedBy === effectiveUserId)
                  .map((request) => (
                    <li key={request.id}>
                      <span className="mission-main">{request.rewardTitle}</span>
                      <StatusPill className="job-status-label">
                        {getRewardRequestStatusLabel(request.status)}
                      </StatusPill>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        ) : null}
      </main>
    </>
  )
}
