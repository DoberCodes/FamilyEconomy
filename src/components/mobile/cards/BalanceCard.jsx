export default function BalanceCard({ credits }) {
  return (
    <section className="panel">
      <p className="panel-label">My Balance</p>
      <div className="balance-row">
        <div>
          <strong className="balance-number">{credits.toLocaleString()}</strong>
          <p className="panel-muted">Credits</p>
          <small className="panel-subtle">Not real currency</small>
        </div>
        <div className="wallet" aria-hidden="true">
          💼
        </div>
      </div>
    </section>
  )
}
