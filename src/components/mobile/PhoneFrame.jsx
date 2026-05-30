export default function PhoneFrame({ children }) {
  return (
    <div className="app-shell">
      <div className="app-canvas">
        <div className="phone-screen">
          {children}
          <footer className="app-footer-brand" aria-label="Application brand">
            Family Economy Alpha
          </footer>
        </div>
      </div>
    </div>
  )
}
