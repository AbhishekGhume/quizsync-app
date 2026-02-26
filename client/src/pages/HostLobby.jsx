import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import {
  Zap, Users, Play, Square, ChevronRight, Copy, Check,
  Wifi, WifiOff, Trophy, Clock, BarChart2, X, ArrowRight
} from 'lucide-react'
import styles from './HostLobby.module.css'

// Generate a 6-digit PIN
function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export default function HostLobby() {
  const { quizId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [session, setSession] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [pinCopied, setPinCopied] = useState(false)
  const [gamePhase, setGamePhase] = useState('lobby') // lobby | playing | results
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [answers, setAnswers] = useState([]) // answers for current question
  const [timeLeft, setTimeLeft] = useState(20)
  const [timerActive, setTimerActive] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [leaderboard, setLeaderboard] = useState([])
  const [ending, setEnding] = useState(false)

  // Load quiz + questions
  useEffect(() => {
    const load = async () => {
      const { data: q } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single()
      setQuiz(q)

      const { data: qs } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index')
      setQuestions(qs || [])
      setLoading(false)
    }
    load()
  }, [quizId])

  // Create session on mount
  useEffect(() => {
    if (!quiz || session) return
    createSession()
  }, [quiz])

  const createSession = async () => {
    setCreating(true)
    const pin = generatePin()
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        quiz_id: quizId,
        teacher_id: user.id,
        pin,
        status: 'waiting',
        current_question: 0,
      })
      .select()
      .single()

    if (!error) setSession(data)
    setCreating(false)
  }

  // Realtime: watch participants join
  useEffect(() => {
    if (!session) return

    // Initial load
    const loadParticipants = async () => {
      const { data } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', session.id)
        .order('joined_at')
      setParticipants(data || [])
    }
    loadParticipants()

    // Subscribe to new joins
    const channel = supabase
      .channel(`session-${session.id}-participants`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'participants',
        filter: `session_id=eq.${session.id}`
      }, payload => {
        setParticipants(prev => [...prev, payload.new])
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [session])

  // Realtime: watch answers come in during a question
  useEffect(() => {
    if (!session || gamePhase !== 'playing') return

    const channel = supabase
      .channel(`session-${session.id}-answers-q${currentQIndex}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'answers',
        filter: `session_id=eq.${session.id}`
      }, payload => {
        setAnswers(prev => {
          // Only count answers for current question
          const currentQ = questions[currentQIndex]
          if (payload.new.question_id === currentQ?.id) {
            return [...prev, payload.new]
          }
          return prev
        })
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [session, gamePhase, currentQIndex, questions])

  // Timer logic
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) {
      if (timeLeft <= 0 && timerActive) {
        setTimerActive(false)
        setShowAnswer(true)
      }
      return
    }
    const t = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(t)
  }, [timerActive, timeLeft])

  const copyPin = () => {
    if (!session) return
    navigator.clipboard.writeText(session.pin)
    setPinCopied(true)
    setTimeout(() => setPinCopied(false), 2000)
  }

  const startGame = async () => {
    if (!session || participants.length === 0) return
    await supabase
      .from('sessions')
      .update({ status: 'active', started_at: new Date().toISOString(), current_question: 0 })
      .eq('id', session.id)

    setGamePhase('playing')
    setCurrentQIndex(0)
    setAnswers([])
    setTimeLeft(20)
    setShowAnswer(false)
    setTimerActive(true)
  }

  const nextQuestion = async () => {
    const next = currentQIndex + 1
    if (next >= questions.length) {
      // End game
      endGame()
      return
    }

    await supabase
      .from('sessions')
      .update({ current_question: next })
      .eq('id', session.id)

    setCurrentQIndex(next)
    setAnswers([])
    setTimeLeft(20)
    setShowAnswer(false)
    setTimerActive(true)
  }

  const endGame = async () => {
    setEnding(true)
    await supabase
      .from('sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', session.id)

    // Load final leaderboard
    const { data } = await supabase
      .from('participants')
      .select('*')
      .eq('session_id', session.id)
      .order('score', { ascending: false })
    setLeaderboard(data || [])
    setGamePhase('results')
    setEnding(false)
  }

  const currentQ = questions[currentQIndex]
  const answerCounts = currentQ
    ? [0, 1, 2, 3].map(i => answers.filter(a => a.selected_index === i && a.question_id === currentQ.id).length)
    : [0, 0, 0, 0]
  const answeredCount = answerCounts.reduce((a, b) => a + b, 0)
  const OPTION_COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#22c55e']
  const OPTION_LABELS = ['A', 'B', 'C', 'D']

  if (loading || creating) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingSpinner} />
        <p>{creating ? 'Creating session...' : 'Loading quiz...'}</p>
      </div>
    )
  }

  // ── RESULTS SCREEN ──
  if (gamePhase === 'results') {
    return (
      <div className={styles.resultsScreen}>
        <div className={styles.resultsHeader}>
          <div className={styles.resultsLogo}><Zap size={18} fill="currentColor" /></div>
          <h1 className={styles.resultsTitle}>Final Results</h1>
          <p className={styles.resultsSubtitle}>{quiz?.title}</p>
        </div>

        <div className={styles.podium}>
          {leaderboard.slice(0, 3).map((p, i) => (
            <div key={p.id} className={`${styles.podiumItem} ${styles[`podium${i + 1}`]}`}>
              <div className={styles.podiumRank}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
              <div className={styles.podiumName}>{p.name}</div>
              <div className={styles.podiumScore}>{p.score} pts</div>
              <div className={styles.podiumBar} style={{ height: `${120 - i * 30}px` }} />
            </div>
          ))}
        </div>

        {leaderboard.length > 3 && (
          <div className={styles.resultsList}>
            {leaderboard.slice(3).map((p, i) => (
              <div key={p.id} className={styles.resultsRow}>
                <span className={styles.resultsRank}>#{i + 4}</span>
                <span className={styles.resultsName}>{p.name}</span>
                <span className={styles.resultsScore}>{p.score} pts</span>
              </div>
            ))}
          </div>
        )}

        <button className={styles.doneBtn} onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    )
  }

  // ── PLAYING SCREEN ──
  if (gamePhase === 'playing' && currentQ) {
    return (
      <div className={styles.playScreen}>
        {/* Top bar */}
        <div className={styles.playTopBar}>
          <div className={styles.playProgress}>
            Q{currentQIndex + 1} / {questions.length}
          </div>
          <div className={`${styles.playTimer} ${timeLeft <= 5 ? styles.timerUrgent : ''}`}>
            <Clock size={16} />
            {timeLeft}s
          </div>
          <div className={styles.playAnswered}>
            <Users size={14} />
            {answeredCount}/{participants.length}
          </div>
        </div>

        {/* Question */}
        <div className={styles.playQuestion}>
          <h2 className={styles.playQuestionText}>{currentQ.text}</h2>
        </div>

        {/* Options grid */}
        <div className={styles.playOptions}>
          {currentQ.options.map((opt, i) => {
            const isCorrect = i === currentQ.correct_index
            const pct = answeredCount > 0 ? Math.round((answerCounts[i] / answeredCount) * 100) : 0
            return (
              <div
                key={i}
                className={`${styles.playOption} ${showAnswer && isCorrect ? styles.playOptionCorrect : ''} ${showAnswer && !isCorrect ? styles.playOptionWrong : ''}`}
                style={{ '--option-color': OPTION_COLORS[i] }}
              >
                <div className={styles.playOptionTop}>
                  <span className={styles.playOptionLabel}
                    style={{ background: OPTION_COLORS[i] }}>
                    {OPTION_LABELS[i]}
                  </span>
                  <span className={styles.playOptionText}>{opt}</span>
                  {showAnswer && isCorrect && <Check size={16} color="#22c55e" />}
                </div>
                {showAnswer && (
                  <div className={styles.playOptionBar}>
                    <div
                      className={styles.playOptionBarFill}
                      style={{ width: `${pct}%`, background: OPTION_COLORS[i] }}
                    />
                    <span className={styles.playOptionPct}>{answerCounts[i]} ({pct}%)</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Control */}
        <div className={styles.playControls}>
          {!showAnswer ? (
            <button className={styles.revealBtn} onClick={() => { setTimerActive(false); setShowAnswer(true) }}>
              Reveal Answer
            </button>
          ) : (
            <button
              className={styles.nextBtn}
              onClick={nextQuestion}
              disabled={ending}
            >
              {ending ? <div className={styles.btnSpinner} /> :
                currentQIndex + 1 >= questions.length
                  ? <><Trophy size={16} /> End & See Results</>
                  : <>Next Question <ChevronRight size={16} /></>
              }
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── LOBBY SCREEN ──
  return (
    <div className={styles.lobbyScreen}>
      {/* Left panel */}
      <div className={styles.lobbyLeft}>
        <div className={styles.lobbyLogo}>
          <div className={styles.logoIcon}><Zap size={16} fill="currentColor" /></div>
          <span>QuizSync</span>
        </div>

        <div className={styles.quizInfo}>
          <div className={styles.quizInfoLabel}>Quiz</div>
          <h1 className={styles.quizInfoTitle}>{quiz?.title}</h1>
          <div className={styles.quizInfoMeta}>
            <span>{questions.length} questions</span>
            <span>·</span>
            <span>{quiz?.subject}</span>
          </div>
        </div>

        {/* PIN display */}
        <div className={styles.pinCard}>
          <div className={styles.pinLabel}>
            <Wifi size={14} />
            Join at <strong>quizsync.app/join</strong>
          </div>
          <div className={styles.pinCode}>
            {session?.pin.slice(0, 3)}-{session?.pin.slice(3)}
          </div>
          <button className={styles.copyBtn} onClick={copyPin}>
            {pinCopied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy PIN</>}
          </button>
        </div>

        <div className={styles.lobbyActions}>
          <button
            className={styles.startBtn}
            onClick={startGame}
            disabled={participants.length === 0}
          >
            <Play size={16} fill="currentColor" />
            Start Game
            {participants.length === 0 && <span className={styles.startHint}>Waiting for players...</span>}
          </button>
          <button className={styles.cancelBtn} onClick={() => navigate('/dashboard')}>
            <X size={14} /> Cancel
          </button>
        </div>
      </div>

      {/* Right panel — participants */}
      <div className={styles.lobbyRight}>
        <div className={styles.participantsHeader}>
          <Users size={16} />
          <span>Players Joined</span>
          <span className={styles.participantCount}>{participants.length}</span>
        </div>

        <div className={styles.participantsList}>
          {participants.length === 0 ? (
            <div className={styles.waitingState}>
              <div className={styles.waitingPulse} />
              <p>Waiting for students to join...</p>
              <p className={styles.waitingHint}>Share the PIN above</p>
            </div>
          ) : (
            participants.map((p, i) => (
              <div key={p.id} className={styles.participantChip}
                style={{ animationDelay: `${i * 0.05}s` }}>
                <div className={styles.participantAvatar}
                  style={{ background: OPTION_COLORS[i % 4] + '33', color: OPTION_COLORS[i % 4] }}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
                {p.name}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}