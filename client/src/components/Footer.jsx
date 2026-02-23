import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          <div className={styles.logoIcon}>
            <Zap size={14} fill="currentColor" />
          </div>
          <span className={styles.logoText}>QuizSync</span>
        </Link>

        <nav className={styles.links}>
          <a href="#" className={styles.link}>Privacy</a>
          <a href="#" className={styles.link}>Terms</a>
          <a href="#" className={styles.link}>Support</a>
        </nav>

        <span className={styles.copy}>© 2024 QuizSync Inc. All rights reserved.</span>
      </div>
    </footer>
  )
}