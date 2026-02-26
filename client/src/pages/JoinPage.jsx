import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Zap, ArrowRight, AlertCircle } from 'lucide-react'
import styles from './JoinPage.module.css'

export default function JoinPage() {
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [name, setName] = useState('')
  const [step, setStep] = useState(1) // 1: PIN, 2: Name
  const [session, setSession] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePinSubmit = async (e) => {
    e.preventDefault()
    const cleaned = pin.replace(/\D/g, '')
    if (cleaned.length !== 6) {
      setError('Please enter a valid 6-digit PIN')
      return
    }

    setLoading(true)
    setError('')

    const { data: sessions, error: err } = await supabase
      .from('sessions')
      .select('*, quizzes(title, subject)')
      .eq('pin', cleaned)
      .eq('status', 'waiting')
      .single()

    setLoading(false)

    if (err || !sessions) {
      setError('Session not found or already started. Check your PIN!')
      return
    }

    setSession(sessions)
    setQuiz(sessions.quizzes)
    setStep(2)
  }

  const handleNameSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please enter your name')
      return
    }

    setLoading(true)
    setError('')

    const { data: participant, error: err } = await supabase
      .from('participants')
      .insert({
        session_id: session.id,
        name: name.trim(),
        score: 0,
      })
      .select()
      .single()

    setLoading(false)

    if (err) {
      setError('Failed to join. Please try again.')
      return
    }

    // Navigate to student game page
    navigate(`/play/${session.id}`, {
      state: { participant, session, quiz }
    })
  }

  const handlePinInput = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 6)
    setPin(raw)
    setError('')
  }

  const formatPin = (raw) => {
    if (raw.length <= 3) return raw
    return raw.slice(0, 3) + '-' + raw.slice(3)
  }

  return (
    <div className={styles.page}>
      <div className={styles.bgBlob1} />
      <div className={styles.bgBlob2} />
      <div className={styles.bgGrid} />

      <div className={styles.logo}>
        <div className={styles.logoIcon}><Zap size={18} fill="currentColor" /></div>
        <span>QuizSync</span>
      </div>

      <div className={styles.card}>
        {step === 1 ? (
          <>
            <div className={styles.cardHeader}>
              <div className={styles.headerEmoji}>🎮</div>
              <h1 className={styles.title}>Join a Quiz</h1>
              <p className={styles.subtitle}>Enter the PIN shown on your teacher's screen</p>
            </div>

            {error && (
              <div className={styles.errorBanner}>
                <AlertCircle size={15} />
                {error}
              </div>
            )}

            <form className={styles.form} onSubmit={handlePinSubmit}>
              <div className={styles.pinInputWrap}>
                <input
                  className={styles.pinInput}
                  type="text"
                  inputMode="numeric"
                  placeholder="000-000"
                  value={formatPin(pin)}
                  onChange={handlePinInput}
                  autoFocus
                  maxLength={7}
                />
              </div>

              <button type="submit" className={styles.submitBtn} disabled={loading || pin.length !== 6}>
                {loading
                  ? <div className={styles.spinner} />
                  : <><span>Find Game</span> <ArrowRight size={16} /></>
                }
              </button>
            </form>

            <p className={styles.hint}>Ask your teacher for the 6-digit game PIN</p>
          </>
        ) : (
          <>
            <div className={styles.cardHeader}>
              <div className={styles.sessionBadge}>
                <span className={styles.sessionDot} />
                Live · {quiz?.subject}
              </div>
              <h1 className={styles.title}>{quiz?.title}</h1>
              <p className={styles.subtitle}>What should we call you?</p>
            </div>

            {error && (
              <div className={styles.errorBanner}>
                <AlertCircle size={15} />
                {error}
              </div>
            )}

            <form className={styles.form} onSubmit={handleNameSubmit}>
              <input
                className={styles.nameInput}
                type="text"
                placeholder="Your name or nickname"
                value={name}
                onChange={e => { setName(e.target.value); setError('') }}
                autoFocus
                maxLength={20}
              />

              <button type="submit" className={styles.submitBtn} disabled={loading || !name.trim()}>
                {loading
                  ? <div className={styles.spinner} />
                  : <><span>Join Game</span> <ArrowRight size={16} /></>
                }
              </button>
            </form>

            <button className={styles.backBtn} onClick={() => { setStep(1); setPin(''); setError('') }}>
              ← Change PIN
            </button>
          </>
        )}
      </div>
    </div>
  )
}