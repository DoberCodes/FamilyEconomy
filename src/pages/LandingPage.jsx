import { Link } from 'react-router-dom'

const heroBackgroundSrc = `${import.meta.env.BASE_URL}login.png`
const logoLockupSrc = `${import.meta.env.BASE_URL}transparentFullLock.png`

const featureGroups = [
  {
    title: 'Earn With Purpose',
    body: 'Kids complete jobs, request checks, and see effort turn into fictional credits they can plan around.',
  },
  {
    title: 'Save For Real Choices',
    body: 'Savings goals, optional savings accounts, and family goals help children practice waiting and prioritizing.',
  },
  {
    title: 'Build Together',
    body: 'Family funds and recognition make responsibility visible without turning the economy into a pressure game.',
  },
]

const principles = [
  'Parent-controlled',
  'Fictional credits only',
  'Kid-friendly choices',
  'Shared family goals',
]

export default function LandingPage() {
  return (
    <main className="landing-page">
      <section
        className="landing-hero"
        style={{ '--landing-hero-image': `url(${heroBackgroundSrc})` }}
      >
        <nav className="landing-nav" aria-label="Landing navigation">
          <img className="landing-nav-logo" src={logoLockupSrc} alt="Family Economy" />
          <div className="landing-nav-actions">
            <Link className="landing-nav-link" to="/auth">Sign in</Link>
            <Link className="landing-nav-button" to="/auth">Start</Link>
          </div>
        </nav>

        <div className="landing-hero-content">
          <p className="landing-kicker">Earn. Save. Achieve. Together.</p>
          <h1>Family Economy</h1>
          <p className="landing-hero-copy">
            A parent-guided household economy that helps kids practice responsibility,
            saving, spending, and shared contribution through everyday family life.
          </p>
          <div className="landing-hero-actions">
            <Link className="landing-primary-action" to="/auth">Parent Sign In</Link>
            <a className="landing-secondary-action" href="#learn">Learn More</a>
          </div>
        </div>
      </section>

      <section id="learn" className="landing-section landing-intro" aria-label="Product principles">
        <div className="landing-section-heading">
          <p className="landing-kicker">Built For Learning</p>
          <h2>Choices kids can understand</h2>
        </div>
        <div className="landing-principle-row">
          {principles.map((principle) => (
            <span key={principle}>{principle}</span>
          ))}
        </div>
      </section>

      <section className="landing-section landing-feature-grid" aria-label="Family Economy features">
        {featureGroups.map((feature) => (
          <article className="landing-feature-card" key={feature.title}>
            <h3>{feature.title}</h3>
            <p>{feature.body}</p>
          </article>
        ))}
      </section>

      <section className="landing-section landing-experience">
        <div className="landing-section-heading">
          <p className="landing-kicker">The Line We Protect</p>
          <h2>Financial literacy without pretending to be a bank</h2>
        </div>
        <p>
          Family Economy uses fictional credits and parent-controlled settings. Advanced
          options explain what they do, what happens, and why a family might use them,
          so the child experience stays focused on making choices instead of managing a
          complicated system.
        </p>
        <Link className="landing-primary-action landing-bottom-action" to="/auth">
          Parent Sign In
        </Link>
      </section>
    </main>
  )
}
