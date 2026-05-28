import BottomTabBar from '../../components/mobile/BottomTabBar'

const storeItems = [
  { name: 'Extra Screen Time', price: 200 },
  { name: 'Choose Dinner', price: 150 },
  { name: 'Movie Night', price: 300 },
]

export default function StorePage() {
  return (
    <>
      <header className="status-row">
        <span>9:41</span>
        <span className="page-title">Store</span>
      </header>
      <main className="phone-content">
        <section className="panel">
          <p className="panel-label">Rewards Store</p>
          <ul className="mission-list">
            {storeItems.map((item) => (
              <li key={item.name}>
                <span className="mission-main">🎁 {item.name}</span>
                <span className="mission-reward">{item.price}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <BottomTabBar />
    </>
  )
}
