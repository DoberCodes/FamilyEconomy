export default function LevelCard({ level, profileName, subtitle, children }) {
  const safeNextXp = Number(level?.nextXp) || 500
  const safeXp = Number(level?.xp) || 0
  const progress = Math.min(100, Math.round((safeXp / safeNextXp) * 100))

  return (
    <section className="hero-card">
      <div className="hero-card-row">
        <div>
          <h1>Hi, {profileName || 'there'}! 👋</h1>
          <p>{subtitle || 'Let\'s build your future.'}</p>
        </div>
        <div className="planet" aria-hidden="true">
          🪐
        </div>
      </div>

      <div className="level-box">
        <p>Level {level.current}</p>
        <div className="xp-track">
          <span style={{ width: `${progress}%` }}></span>
        </div>
        <small>
          {safeXp} / {safeNextXp} XP
        </small>
      </div>

      {children ? <div className="hero-card-footer">{children}</div> : null}
    </section>
  )
}
