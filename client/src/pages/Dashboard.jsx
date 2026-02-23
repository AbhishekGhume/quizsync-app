import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Zap, LogOut } from 'lucide-react'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Teacher'

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navLogo}>
          <div className={styles.logoIcon}><Zap size={14} fill="currentColor" /></div>
          <span>QuizSync</span>
        </div>
        <button className={styles.signOutBtn} onClick={handleSignOut}>
          <LogOut size={15} />
          Sign Out
        </button>
      </nav>

      <main className={styles.main}>
        <div className={styles.welcomeCard}>
          <h1 className={styles.heading}>Good Morning, {firstName}! 👋</h1>
          <p className={styles.subtext}>Your dashboard is coming soon. The full UI is being built out!</p>

          <div className={styles.comingSoon}>
            <div className={styles.feature}>📊 Reports & Analytics</div>
            <div className={styles.feature}>🤖 AI Quiz Generator</div>
            <div className={styles.feature}>🎮 Live Quiz Sessions</div>
            <div className={styles.feature}>👥 Student Management</div>
          </div>
        </div>
      </main>
    </div>
  )
}