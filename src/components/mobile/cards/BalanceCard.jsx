export default function BalanceCard({ credits }) {
  return (
    <section className="panel">
      <p className="panel-label">Credit Wallet</p>
      <div className="balance-row">
        <div>
          <strong className="balance-number">{credits.toLocaleString()}</strong>
          <p className="panel-muted">Fictional credits you can spend on rewards.</p>
        </div>
        <div className="wallet" aria-hidden="true">
          💼
        </div>
      </div>
    </section>
  )
}
