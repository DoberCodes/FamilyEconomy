export default function PhoneFrame({ children }) {
  return (
    <div className="app-shell">
      <div className="app-canvas">
        <div className="phone-screen">{children}</div>
      </div>
    </div>
  )
}
