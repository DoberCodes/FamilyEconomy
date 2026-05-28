export default function LevelCard({ level, profileName = 'Alex' }) {
  const progress = Math.round((level.xp / level.nextXp) * 100)

  return (
    <section className="hero-card">
      <div className="hero-card-row">
        <div>
          <h1>Hi, {profileName}! 👋</h1>
          <p>Let&apos;s build your future.</p>
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
          {level.xp} / {level.nextXp} XP
        </small>
      </div>
    </section>
  )
}
