import { useState, useEffect, useCallback } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Zap, Trophy, Clock, Check, X } from 'lucide-react'
import styles from './StudentGame.module.css'

const OPTION_COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#22c55e']
const OPTION_LABELS = ['A', 'B', 'C', 'D']
const POINTS_BASE = 1000
const TIME_LIMIT = 20

export default function StudentGame() {
  const { sessionId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const { participant, session: initialSession, quiz } = location.state || {}

  const [phase, setPhase] = useState('waiting') // waiting | question | answered | results
  const [currentQ, setCurrentQ] = useState(null)
  const [currentQIndex, setCurrentQIndex] = useState(-1)
  const [questions, setQuestions] = useState([])
  const [selectedOption, setSelectedOption] = useState(null)
  const [isCorrect, setIsCorrect] = useState(null)
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT)
  const [timerActive, setTimerActive] = useState(false)
  const [score, setScore] = useState(0)
  const [pointsEarned, setPointsEarned] = useState(0)
  const [leaderboard, setLeaderboard] = useState([])
  const [myRank, setMyRank] = useState(null)
  const [answeredThisQ, setAnsweredThisQ] = useState(false)
  const [sessionStatus, setSessionStatus] = useState('waiting')

  // Guard: if no participant state, redirect to join
  useEffect(() => {
    if (!participant) {
      navigate('/join')
    }
  }, [participant])

  // Load questions
  useEffect(() => {
    if (!initialSession?.quiz_id) return
    supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', initialSession.quiz_id)
      .order('order_index')
      .then(({ data }) => setQuestions(data || []))
  }, [initialSession])

  // Realtime: watch session status changes
  useEffect(() => {
    if (!sessionId) return

    const channel = supabase
      .channel(`student-session-${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `id=eq.${sessionId}`
      }, payload => {
        const updated = payload.new
        setSessionStatus(updated.status)

        if (updated.status === 'active') {
          const qIdx = updated.current_question || 0
          setCurrentQIndex(qIdx)
          setPhase('question')
          setSelectedOption(null)
          setIsCorrect(null)
          setAnsweredThisQ(false)
          setTimeLeft(TIME_LIMIT)
          setTimerActive(true)
        }

        if (updated.status === 'ended') {
          loadFinalResults()
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [sessionId, questions])

  // Watch for question changes during active session
  useEffect(() => {
    if (!sessionId || sessionStatus !== 'active') return

    const channel = supabase
      .channel(`student-question-${sessionId}-${currentQIndex}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `id=eq.${sessionId}`
      }, payload => {
        const newIdx = payload.new.current_question
        if (newIdx !== currentQIndex && payload.new.status === 'active') {
          setCurrentQIndex(newIdx)
          setPhase('question')
          setSelectedOption(null)
          setIsCorrect(null)
          setAnsweredThisQ(false)
          setTimeLeft(TIME_LIMIT)
          setTimerActive(true)
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [sessionId, currentQIndex, sessionStatus])

  // Set current question when index changes
  useEffect(() => {
    if (currentQIndex >= 0 && questions.length > 0) {
      setCurrentQ(questions[currentQIndex])
    }
  }, [currentQIndex, questions])

  // Timer
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) {
      if (timeLeft <= 0 && timerActive) {
        setTimerActive(false)
        if (!answeredThisQ) {
          setPhase('answered')
          setIsCorrect(false)
        }
      }
      return
    }
    const t = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(t)
  }, [timerActive, timeLeft, answeredThisQ])

  const handleAnswer = async (optionIndex) => {
    if (answeredThisQ || !currentQ || phase !== 'question') return

    setSelectedOption(optionIndex)
    setAnsweredThisQ(true)
    setTimerActive(false)

    const correct = optionIndex === currentQ.correct_index
    setIsCorrect(correct)
    setPhase('answered')

    // Calculate points (time-based bonus)
    const timeTaken = (TIME_LIMIT - timeLeft) * 1000
    const timeBonus = correct ? Math.round((timeLeft / TIME_LIMIT) * POINTS_BASE) : 0
    const pts = correct ? Math.max(100, timeBonus) : 0

    setPointsEarned(pts)
    setScore(prev => prev + pts)

    // Save answer to Supabase
    await supabase.from('answers').insert({
      session_id: sessionId,
      participant_id: participant.id,
      question_id: currentQ.id,
      selected_index: optionIndex,
      is_correct: correct,
      time_taken_ms: timeTaken,
      points: pts,
    })

    // Update participant score
    await supabase
      .from('participants')
      .update({ score: score + pts })
      .eq('id', participant.id)
  }

  const loadFinalResults = async () => {
    const { data } = await supabase
      .from('participants')
      .select('*')
      .eq('session_id', sessionId)
      .order('score', { ascending: false })

    if (data) {
      setLeaderboard(data)
      const rank = data.findIndex(p => p.id === participant?.id) + 1
      setMyRank(rank)
    }
    setPhase('results')
  }

  const timerPct = (timeLeft / TIME_LIMIT) * 100

  // ── WAITING SCREEN ──
  if (phase === 'waiting') {
    return (
      <div className={styles.waitingScreen}>
        <div className={styles.waitingLogo}>
          <div className={styles.logoIcon}><Zap size={18} fill="currentColor" /></div>
          <span>QuizSync</span>
        </div>
        <div className={styles.waitingCard}>
          <div className={styles.waitingPulseOuter}>
            <div className={styles.waitingPulseInner} />
          </div>
          <h2 className={styles.waitingTitle}>You're in!</h2>
          <p className={styles.waitingName}>{participant?.name}</p>
          <p className={styles.waitingHint}>Waiting for the teacher to start the game...</p>
          <div className={styles.quizBadge}>
            📝 {quiz?.title}
          </div>
        </div>
      </div>
    )
  }

  // ── RESULTS SCREEN ──
  if (phase === 'results') {
    const myData = leaderboard.find(p => p.id === participant?.id)
    return (
      <div className={styles.resultsScreen}>
        <div className={styles.resultsTop}>
          <div className={styles.logoIcon} style={{ width: 36, height: 36 }}>
            <Zap size={16} fill="currentColor" />
          </div>
        </div>

        <div className={styles.myResult}>
          <div className={styles.myRankBadge}>
            {myRank === 1 ? '🥇' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : `#${myRank}`}
          </div>
          <h2 className={styles.myName}>{participant?.name}</h2>
          <div className={styles.myScore}>{myData?.score || score} pts</div>
          <p className={styles.myRankText}>
            {myRank === 1 ? '🎉 You won!' : `Ranked #${myRank} of ${leaderboard.length}`}
          </p>
        </div>

        <div className={styles.leaderboardCard}>
          <h3 className={styles.leaderboardTitle}>Final Leaderboard</h3>
          {leaderboard.slice(0, 5).map((p, i) => (
            <div
              key={p.id}
              className={`${styles.leaderRow} ${p.id === participant?.id ? styles.leaderRowMe : ''}`}
            >
              <span className={styles.leaderRank}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </span>
              <span className={styles.leaderName}>{p.name}</span>
              <span className={styles.leaderScore}>{p.score}</span>
            </div>
          ))}
        </div>

        <button className={styles.doneBtn} onClick={() => navigate('/join')}>
          Play Again
        </button>
      </div>
    )
  }

  // ── QUESTION / ANSWERED SCREEN ──
  return (
    <div className={styles.gameScreen}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.scoreDisplay}>
          <Trophy size={14} />
          {score} pts
        </div>

        {/* Timer ring */}
        <div className={styles.timerRing}>
          <svg viewBox="0 0 40 40" className={styles.timerSvg}>
            <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
            <circle
              cx="20" cy="20" r="16"
              fill="none"
              stroke={timeLeft <= 5 ? '#ef4444' : '#22c55e'}
              strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 16}`}
              strokeDashoffset={`${2 * Math.PI * 16 * (1 - timerPct / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 20 20)"
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
            />
          </svg>
          <span className={styles.timerNum} style={{ color: timeLeft <= 5 ? '#ef4444' : 'var(--text-primary)' }}>
            {timeLeft}
          </span>
        </div>

        <div className={styles.qProgress}>
          Q{currentQIndex + 1}/{questions.length}
        </div>
      </div>

      {/* Question */}
      <div className={styles.questionBox}>
        <p className={styles.questionText}>{currentQ?.text}</p>
      </div>

      {/* Options */}
      <div className={styles.optionsGrid}>
        {currentQ?.options.map((opt, i) => {
          const isSelected = selectedOption === i
          const isThisCorrect = i === currentQ.correct_index
          let optStyle = ''
          if (phase === 'answered') {
            if (isThisCorrect) optStyle = styles.optCorrect
            else if (isSelected && !isCorrect) optStyle = styles.optWrong
            else optStyle = styles.optDim
          }

          return (
            <button
              key={i}
              className={`${styles.optBtn} ${optStyle}`}
              style={{ '--c': OPTION_COLORS[i] }}
              onClick={() => handleAnswer(i)}
              disabled={phase === 'answered'}
            >
              <span
                className={styles.optLabel}
                style={{ background: OPTION_COLORS[i] }}
              >
                {OPTION_LABELS[i]}
              </span>
              <span className={styles.optText}>{opt}</span>
              {phase === 'answered' && isThisCorrect && (
                <Check size={18} color="#22c55e" className={styles.optCheck} />
              )}
              {phase === 'answered' && isSelected && !isCorrect && (
                <X size={18} color="#ef4444" className={styles.optCheck} />
              )}
            </button>
          )
        })}
      </div>

      {/* Result feedback */}
      {phase === 'answered' && (
        <div className={`${styles.feedback} ${isCorrect ? styles.feedbackCorrect : styles.feedbackWrong}`}>
          {isCorrect ? (
            <>
              <span className={styles.feedbackEmoji}>✅</span>
              <span className={styles.feedbackText}>Correct!</span>
              <span className={styles.feedbackPts}>+{pointsEarned} pts</span>
            </>
          ) : (
            <>
              <span className={styles.feedbackEmoji}>❌</span>
              <span className={styles.feedbackText}>
                {selectedOption === null ? 'Time up!' : 'Wrong answer'}
              </span>
            </>
          )}
          <span className={styles.feedbackWait}>Waiting for next question...</span>
        </div>
      )}
    </div>
  )
}