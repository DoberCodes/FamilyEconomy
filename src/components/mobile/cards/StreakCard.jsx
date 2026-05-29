export default function StreakCard({ days = 0 }) {
  const weeklyDays = Math.max(0, Math.min(7, Number(days) || 0))

  return (
    <section className="streak-card">
      <div>
        <p>🔥 {weeklyDays} Day Streak!</p>
        <small>Complete jobs on 5 days this week for bonus XP.</small>
      </div>
      <div className="streak-dots" aria-hidden="true">
        {Array.from({ length: 7 }).map((_, index) => (
          <span
            key={`streak-day-${index}`}
            className={index < weeklyDays ? 'streak-dot-active' : 'streak-dot-idle'}
          ></span>
        ))}
      </div>
      <div className="treasure" aria-hidden="true">
        🧰
      </div>
    </section>
  )
}
