const splashImageSrc = `${import.meta.env.BASE_URL}verticaltagline.png`

export default function SplashScreen({
  message = 'Loading Family Economy...',
  detail,
  error,
}) {
  return (
    <main className="splash-screen" aria-busy="true" aria-live="polite">
      <img className="splash-screen-image" src={splashImageSrc} alt="Family Economy" />
      <div className="splash-screen-status">
        <p>{message}</p>
        {detail ? <span>{detail}</span> : null}
        {error ? <span className="splash-screen-error">{error}</span> : null}
        <div className="loading-dots splash-screen-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </main>
  )
}
