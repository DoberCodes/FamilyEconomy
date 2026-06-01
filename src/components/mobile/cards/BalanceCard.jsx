export default function BalanceCard({ credits }) {
  return (
    <section className="panel">
      <p className="panel-label">My Wallet</p>
      <div className="balance-row">
        <div>
          <strong className="balance-number">{credits.toLocaleString()}</strong>
          <p className="panel-muted">Coins you can spend on rewards.</p>
        </div>
        <div className="wallet" aria-hidden="true">
          💼
        </div>
      </div>
    </section>
  )
}
