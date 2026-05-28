export default function StreakCard({ days = 5 }) {
  return (
    <section className="streak-card">
      <div>
        <p>🔥 {days} Day Streak!</p>
        <small>Keep it up, Alex!</small>
      </div>
      <div className="streak-dots" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span className="streak-last"></span>
      </div>
      <div className="treasure" aria-hidden="true">
        🧰
      </div>
    </section>
  )
}
