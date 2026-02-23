import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Zap, Menu, X } from 'lucide-react'
import styles from './Navbar.module.css'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          <div className={styles.logoIcon}>
            <Zap size={16} fill="currentColor" />
          </div>
          <span className={styles.logoText}>QuizSync</span>
        </Link>

        <div className={styles.links}>
          <a href="#features" className={styles.link}>Features</a>
          <a href="#pricing" className={styles.link}>Pricing</a>
          <a href="#resources" className={styles.link}>Resources</a>
        </div>

        <div className={styles.actions}>
          {user ? (
            <>
              <Link to="/dashboard" className={styles.btnSecondary}>Dashboard</Link>
              <button onClick={handleSignOut} className={styles.btnPrimary}>Sign Out</button>
            </>
          ) : (
            <>
              <Link to="/login" className={styles.btnGhost}>Log in</Link>
              <Link to="/signup" className={styles.btnPrimary}>Get Started</Link>
            </>
          )}
        </div>

        <button className={styles.hamburger} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {menuOpen && (
        <div className={styles.mobileMenu}>
          <a href="#features" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Features</a>
          <a href="#pricing" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Pricing</a>
          <a href="#resources" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Resources</a>
          <div className={styles.mobileDivider} />
          {user ? (
            <>
              <Link to="/dashboard" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <button onClick={handleSignOut} className={styles.mobileBtnPrimary}>Sign Out</button>
            </>
          ) : (
            <>
              <Link to="/login" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Log in</Link>
              <Link to="/signup" className={styles.mobileBtnPrimary} onClick={() => setMenuOpen(false)}>Get Started</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}