import { Link } from 'react-router-dom'
import styles from './CTABanner.module.css'

export default function CTABanner() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.glow} />
          <div className={styles.content}>
            <h2 className={styles.title}>Start Conducting Smarter Assessments</h2>
            <p className={styles.subtitle}>
              Join institutions modernizing classroom evaluation with QuizSync.
            </p>
            <div className={styles.actions}>
              <Link to="/signup" className={styles.btnPrimary}>Get Started</Link>
              <Link to="#pricing" className={styles.btnSecondary}>View Plans</Link>
            </div>
          </div>
          <div className={styles.decorDot1} />
          <div className={styles.decorDot2} />
        </div>
      </div>
    </section>
  )
}