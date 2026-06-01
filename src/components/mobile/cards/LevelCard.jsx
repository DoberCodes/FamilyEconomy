import ProgressTrack from '../../shared/ProgressTrack'

export default function LevelCard({ level, profileName, subtitle, creditsBalance, children }) {
  const safeNextXp = Number(level?.nextXp) || 500
  const safeXp = Number(level?.xp) || 0
  const progress = Math.min(100, Math.round((safeXp / safeNextXp) * 100))
  const parsedCredits = Number(creditsBalance)
  const hasCreditsBalance = Number.isFinite(parsedCredits)
  const safeCredits = hasCreditsBalance ? Math.max(0, Math.round(parsedCredits)) : 0

  return (
    <section className="hero-card">
      <div className="hero-card-row">
        <div className="hero-card-identity">
          <div className="hero-card-greeting-row">
            <h1>Hi, {profileName || 'there'}! 👋</h1>
            {hasCreditsBalance ? (
              <span className="hero-credits-pill">Credit Wallet: {safeCredits.toLocaleString()} credits</span>
            ) : null}
          </div>
          <div className="hero-card-copy">
            <p>{subtitle || 'Let\'s build your future.'}</p>
          </div>
        </div>
      </div>
      <div className="hero-card-planet" aria-hidden="true">🪐</div>

      <div className="level-box">
        <p>Level {level.current}</p>
        <ProgressTrack value={progress} label="XP progress" />
        <small>
          {safeXp} / {safeNextXp} XP
        </small>
      </div>

      {children ? <div className="hero-card-footer">{children}</div> : null}
    </section>
  )
}
