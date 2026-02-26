import { Link } from 'react-router-dom'
import { ArrowRight, Zap } from 'lucide-react'
import styles from './Hero.module.css'

const quizOptions = [
  { label: 'Mitochondria', icon: '🔬', selected: false },
  { label: 'Nucleus', icon: '⚛️', selected: true, correct: true },
  { label: 'Ribosome', icon: '🧬', selected: false },
  { label: 'Cell Wall', icon: '🌿', selected: true },
]

export default function Hero() {
  return (
    <section className={styles.hero}>
      {/* Background effects */}
      <div className={styles.bgBlob1} />
      <div className={styles.bgBlob2} />
      <div className={styles.bgGrid} />

      <div className={styles.container}>
        <div className={styles.content}>
          <div className={`${styles.badge} animate-fade-in-up`}>
            <span className={styles.badgeDot} />
            Powered by Gemini AI
          </div>

          <h1 className={`${styles.headline} animate-fade-in-up animate-delay-1`}>
            Empower Your<br />
            Classroom with<br />
            <span className={styles.headlineGreen}>Smart Assessments</span>
          </h1>

          <p className={`${styles.subtext} animate-fade-in-up animate-delay-2`}>
            Engage students with structured quizzes, real-time performance
            tracking, and AI-assisted question generation. Make assessments
            efficient, transparent, and impactful.
          </p>

          <div className={`${styles.cta} animate-fade-in-up animate-delay-3`}>
            <Link to="/dashboard" className={styles.ctaPrimary}>
              Create Assessment
            </Link>
            <Link to="/join" className={styles.ctaSecondary}>
              Enter Quiz Code <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Quiz Card Preview */}
        <div className={`${styles.preview} animate-fade-in-up animate-delay-2`}>
          <div className={styles.quizCard}>
            <div className={styles.quizHeader}>
              <div className={styles.quizStreak}>
                <Zap size={12} fill="currentColor" />
                STREAK: 5×
              </div>
              <div className={styles.quizScore}>
                <span className={styles.scoreDot} />
                Score: 4500
              </div>
            </div>

            <div className={styles.quizQuestion}>
              What is the powerhouse of the cell?
            </div>

            <div className={styles.quizOptions}>
              {quizOptions.map((opt, i) => (
                <button
                  key={i}
                  className={`${styles.quizOption} ${opt.selected ? (opt.correct ? styles.correct : styles.selected) : ''}`}
                >
                  <span className={styles.optionIcon}>{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>

            <div className={styles.quizFooter}>
              <span>Connected to Game PIN: 839-442</span>
              <span>QuizSync v2.4</span>
            </div>
          </div>

          {/* Floating decorations */}
          <div className={styles.floatingBadge1}>
            <Zap size={12} fill="currentColor" />
            5× Streak!
          </div>
          <div className={styles.floatingBadge2}>
            🏆 #1 Alice M. — 9,800 pts
          </div>
        </div>
      </div>
    </section>
  )
}