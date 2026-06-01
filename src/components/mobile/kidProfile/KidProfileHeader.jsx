import LevelCard from '../cards/LevelCard'
import { KID_PROFILE_TABS } from './kidProfileConstants'

function tabHasUpdate(tabKey, updates) {
  return (
    (tabKey === 'rules' && updates.hasUnreadHouseRulesUpdate) ||
    (tabKey === 'jobs' && updates.hasUnreadJobsUpdate) ||
    (tabKey === 'rewards' && updates.hasUnreadRewardsUpdate)
  )
}

export default function KidProfileHeader({
  dashboard,
  profileName,
  achievementsEnabled,
  familyRecognitionEnabled,
  topHeroBadges = [],
  earnedBadgeCount = 0,
  activeTab,
  onTabChange,
  hasUnreadHouseRulesUpdate,
  hasUnreadJobsUpdate,
  hasUnreadRewardsUpdate,
}) {
  const showBadges = achievementsEnabled || familyRecognitionEnabled
  const updates = {
    hasUnreadHouseRulesUpdate,
    hasUnreadJobsUpdate,
    hasUnreadRewardsUpdate,
  }

  return (
    <>
      <LevelCard
        level={dashboard.level}
        profileName={profileName}
        subtitle="Your kid session is active. This space is just for you."
        creditsBalance={dashboard.balance?.credits || 0}
      >
        {showBadges ? (
          <section className="hero-badge-strip" aria-label="Top badges and recognition">
            <div className="hero-badge-head">
              <p className="hero-badge-heading">Top badges</p>
              <span className="hero-badge-total">{earnedBadgeCount} earned</span>
            </div>
            {topHeroBadges.length === 0 ? (
              <p className="hero-badge-empty">Complete goals and help your family to unlock badges.</p>
            ) : (
              <div className="hero-badge-row">
                {topHeroBadges.map((badge) => (
                  <span key={`hero:${badge.id}`} className="hero-badge-chip">
                    {badge.icon} {badge.label}
                  </span>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </LevelCard>

      <section className="panel quick-nav-panel" aria-label="Quick navigation">
        <p className="panel-label quick-nav-title">Quick Adventure Nav</p>
        <p className="panel-muted quick-nav-subtitle">Jump to what you want to do next.</p>
        <div className="quick-nav-row" role="tablist" aria-label="Child dashboard sections">
          {KID_PROFILE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={activeTab === tab.key ? 'quick-nav-tab quick-nav-tab-active' : 'quick-nav-tab'}
              onClick={() => onTabChange(tab.key)}
              role="tab"
              aria-selected={activeTab === tab.key}
            >
              {activeTab === tab.key ? <span className="quick-nav-active-icon" aria-hidden="true">*</span> : null}
              {tab.label}
              {tabHasUpdate(tab.key, updates) ? <span className="quick-nav-badge">New</span> : null}
            </button>
          ))}
        </div>
      </section>
    </>
  )
}
