import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import {
  BarChart2, Users, Clock, Trophy, ChevronRight, X,
  ArrowUpRight, ArrowDownRight, Minus, Zap,
  Calendar, Award, Target, Activity, Check,
  TrendingUp, ChevronDown, ChevronUp
} from 'lucide-react'
import styles from './ReportsPage.module.css'

const SUBJECT_COLORS = {
  Physics: '#f59e0b', Chemistry: '#ef4444', Biology: '#22c55e',
  Mathematics: '#3b82f6', History: '#8b5cf6', Geography: '#06b6d4',
  English: '#ec4899', Computer: '#f97316', Economics: '#14b8a6', Other: '#6b7280'
}
const OPTION_COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#22c55e']
const OPTION_LABELS = ['A', 'B', 'C', 'D']

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = iso => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
const fmtTime = iso => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
const fmtDur  = (a, b) => { if (!b) return null; const m = Math.round((new Date(b) - new Date(a)) / 60000); return m < 1 ? '<1m' : `${m}m` }
const accColor = p => p >= 70 ? '#22c55e' : p >= 40 ? '#f59e0b' : '#ef4444'
const rankEmoji = i => ['🥇','🥈','🥉'][i] ?? null

// ── Mini Bar Chart ────────────────────────────────────────────────────────────
function MiniBarChart({ data, color = '#22c55e' }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className={styles.miniChart}>
      {data.map((d, i) => (
        <div key={i} className={styles.miniBar} title={`${d.label}: ${d.value}`}>
          <div className={styles.miniBarFill} style={{ height: `${(d.value / max) * 100}%`, background: color }} />
          <span className={styles.miniBarLabel}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Donut Chart ───────────────────────────────────────────────────────────────
function DonutChart({ correct, total, size = 88, sw = 8 }) {
  const pct = total === 0 ? 0 : Math.round((correct / total) * 100)
  const r = size / 2 - sw, circ = 2 * Math.PI * r, dash = (pct / 100) * circ
  const color = accColor(pct), cx = size / 2, cy = size / 2
  return (
    <div className={styles.donut} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      </svg>
      <div className={styles.donutCenter}>
        <span className={styles.donutPct} style={{ color, fontSize: size < 70 ? 12 : 16 }}>{pct}%</span>
      </div>
    </div>
  )
}

// ── Question Breakdown Row ────────────────────────────────────────────────────
function QuestionBreakdown({ question, qIndex, answers }) {
  const [open, setOpen] = useState(false)
  const qa    = answers.filter(a => a.question_id === question.id)
  const total = qa.length
  const correct = qa.filter(a => a.is_correct).length
  const pct = total === 0 ? 0 : Math.round((correct / total) * 100)
  const optCounts = OPTION_LABELS.map((_, i) => qa.filter(a => a.selected_index === i).length)
  const maxOpt = Math.max(...optCounts, 1)

  return (
    <div className={styles.qBreakdown}>
      <button className={styles.qBreakdownHeader} onClick={() => setOpen(o => !o)}>
        <div className={styles.qBreakdownLeft}>
          <span className={styles.qBreakdownNum}>Q{qIndex + 1}</span>
          <span className={styles.qBreakdownText}>{question.text}</span>
        </div>
        <div className={styles.qBreakdownRight}>
          <div className={styles.qBreakdownAccuracy}>
            <div className={styles.qBreakdownBar}>
              <div className={styles.qBreakdownBarFill} style={{ width: `${pct}%`, background: accColor(pct) }} />
            </div>
            <span style={{ color: accColor(pct), fontWeight: 700, fontSize: 13, minWidth: 36 }}>{pct}%</span>
          </div>
          <span className={styles.qBreakdownCount}>{correct}/{total}</span>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {open && (
        <div className={styles.qBreakdownBody}>
          {question.options.map((opt, oi) => {
            const isCorrect = oi === question.correct_index
            const count = optCounts[oi]
            const barPct = Math.round((count / maxOpt) * 100)
            return (
              <div key={oi} className={`${styles.qOpt} ${isCorrect ? styles.qOptCorrect : ''}`}>
                <div className={styles.qOptTop}>
                  <span className={styles.qOptLabel} style={{ background: OPTION_COLORS[oi] }}>{OPTION_LABELS[oi]}</span>
                  <span className={styles.qOptText}>{opt}</span>
                  {isCorrect && <Check size={13} color="#22c55e" style={{ flexShrink: 0 }} />}
                  <span className={styles.qOptCount}>{count} {count === 1 ? 'student' : 'students'}</span>
                </div>
                <div className={styles.qOptBar}>
                  <div className={styles.qOptBarFill}
                    style={{ width: `${barPct}%`, background: isCorrect ? '#22c55e' : 'rgba(255,255,255,0.1)' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Session Detail Drawer ─────────────────────────────────────────────────────
function SessionDetailDrawer({ session, onClose }) {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [section, setSection]   = useState('leaderboard')

  useEffect(() => { loadDetail() }, [session.id])

  const loadDetail = async () => {
    setLoading(true)
    const [{ data: participants }, { data: answers }, { data: questions }] = await Promise.all([
      supabase.from('participants').select('*').eq('session_id', session.id).order('score', { ascending: false }),
      supabase.from('answers').select('*').eq('session_id', session.id),
      supabase.from('questions').select('*').eq('quiz_id', session.quiz_id).order('order_index'),
    ])
    setData({ participants: participants || [], answers: answers || [], questions: questions || [] })
    setLoading(false)
  }

  const dur      = fmtDur(session.started_at || session.created_at, session.ended_at)
  const maxScore = data?.participants?.length ? Math.max(...data.participants.map(p => p.score)) : 0
  const avgScore = data?.participants?.length ? Math.round(data.participants.reduce((s, p) => s + p.score, 0) / data.participants.length) : 0
  const totalAns = data?.answers?.length || 0
  const corrAns  = data?.answers?.filter(a => a.is_correct).length || 0
  const accuracy = totalAns ? Math.round((corrAns / totalAns) * 100) : 0

  return (
    <>
      <div className={styles.drawerBackdrop} onClick={onClose} />
      <div className={styles.drawer}>

        {/* Header */}
        <div className={styles.drawerHeader}>
          <div className={styles.drawerHeaderLeft}>
            <div className={styles.drawerHeaderTitle}>{session.quiz_title || 'Session Detail'}</div>
            <div className={styles.drawerHeaderMeta}>
              {fmtDate(session.created_at)} · {fmtTime(session.created_at)}
              {dur && ` · ${dur}`}
              {session.quiz_subject && (
                <span className={styles.drawerSubjectBadge}
                  style={{ background: (SUBJECT_COLORS[session.quiz_subject] || '#6b7280') + '22', color: SUBJECT_COLORS[session.quiz_subject] || '#6b7280' }}>
                  {session.quiz_subject}
                </span>
              )}
            </div>
          </div>
          <button className={styles.drawerClose} onClick={onClose}><X size={18} /></button>
        </div>

        {/* KPIs */}
        <div className={styles.drawerKpis}>
          {[
            { icon: Users,     color: 'var(--text-muted)', val: session.participant_count ?? 0, lbl: 'Students' },
            { icon: Trophy,    color: '#f59e0b', val: session.top_score ?? 0, lbl: 'Top Score' },
            { icon: TrendingUp,color: '#3b82f6', val: avgScore, lbl: 'Avg Score' },
            { icon: Target,    color: accColor(accuracy), val: `${accuracy}%`, lbl: 'Accuracy', valColor: accColor(accuracy) },
          ].map(({ icon: Icon, color, val, lbl, valColor }, i, arr) => (
            <>
              <div key={lbl} className={styles.drawerKpi}>
                <Icon size={14} color={color} />
                <span className={styles.drawerKpiVal} style={valColor ? { color: valColor } : {}}>{val}</span>
                <span className={styles.drawerKpiLbl}>{lbl}</span>
              </div>
              {i < arr.length - 1 && <div key={`div-${i}`} className={styles.drawerKpiDivider} />}
            </>
          ))}
        </div>

        {/* Section Tabs */}
        <div className={styles.drawerTabs}>
          <button className={`${styles.drawerTab} ${section === 'leaderboard' ? styles.drawerTabActive : ''}`}
            onClick={() => setSection('leaderboard')}>
            <Trophy size={13} /> Leaderboard
          </button>
          <button className={`${styles.drawerTab} ${section === 'questions' ? styles.drawerTabActive : ''}`}
            onClick={() => setSection('questions')}>
            <BarChart2 size={13} /> Question Breakdown
          </button>
        </div>

        {/* Body */}
        <div className={styles.drawerBody}>
          {loading ? (
            <div className={styles.drawerLoading}><div className={styles.drawerSpinner} /><span>Loading...</span></div>
          ) : section === 'leaderboard' ? (

            /* Leaderboard */
            <div className={styles.leaderboardList}>
              {data.participants.length === 0
                ? <div className={styles.drawerEmpty}>No participants recorded</div>
                : data.participants.map((p, i) => {
                  const pa  = data.answers.filter(a => a.participant_id === p.id)
                  const pc  = pa.filter(a => a.is_correct).length
                  const pacc = pa.length ? Math.round((pc / pa.length) * 100) : 0
                  const avgT = pa.length ? Math.round(pa.reduce((s, a) => s + (a.time_taken_ms || 0), 0) / pa.length / 1000) : null
                  const pct  = maxScore > 0 ? Math.round((p.score / maxScore) * 100) : 0

                  return (
                    <div key={p.id} className={`${styles.leaderRow} ${i === 0 ? styles.leaderTop1 : i === 1 ? styles.leaderTop2 : i === 2 ? styles.leaderTop3 : ''}`}>
                      <div className={styles.leaderRank}>
                        {rankEmoji(i)
                          ? <span className={styles.leaderEmoji}>{rankEmoji(i)}</span>
                          : <span className={styles.leaderNum}>#{i + 1}</span>}
                      </div>
                      <div className={styles.leaderAvatar}
                        style={{ background: OPTION_COLORS[i % 4] + '33', color: OPTION_COLORS[i % 4] }}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.leaderInfo}>
                        <div className={styles.leaderName}>{p.name}</div>
                        <div className={styles.leaderMeta}>
                          {pc}/{pa.length} correct
                          {avgT !== null && ` · avg ${avgT}s/q`}
                        </div>
                      </div>
                      <div className={styles.leaderScoreWrap}>
                        <div className={styles.leaderScoreBar}>
                          <div className={styles.leaderScoreBarFill}
                            style={{ width: `${pct}%`, background: OPTION_COLORS[i % 4] }} />
                        </div>
                        <span className={styles.leaderScore}>{p.score} pts</span>
                      </div>
                      <div className={styles.leaderAccBadge}
                        style={{ color: accColor(pacc), background: accColor(pacc) + '22' }}>
                        {pacc}%
                      </div>
                    </div>
                  )
                })
              }
            </div>

          ) : (

            /* Question Breakdown */
            <div className={styles.questionBreakdownList}>
              {data.questions.length === 0
                ? <div className={styles.drawerEmpty}>No questions found</div>
                : data.questions.map((q, qi) => (
                  <QuestionBreakdown key={q.id} question={q} qIndex={qi} answers={data.answers} />
                ))
              }
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Quiz Detail Drawer ────────────────────────────────────────────────────────
function QuizDetailDrawer({ quizStat, sessions, onClose, onSessionClick }) {
  const quizSessions = sessions.filter(s => s.quiz_title === quizStat.title)
  const color = SUBJECT_COLORS[quizStat.subject] || '#6b7280'

  return (
    <>
      <div className={styles.drawerBackdrop} onClick={onClose} />
      <div className={styles.drawer}>
        <div className={styles.drawerHeader}>
          <div className={styles.drawerHeaderLeft}>
            <div className={styles.drawerHeaderTitle}>{quizStat.title}</div>
            <div className={styles.drawerHeaderMeta}>
              {quizStat.subject && (
                <span className={styles.drawerSubjectBadge} style={{ background: color + '22', color }}>
                  {quizStat.subject}
                </span>
              )}
              All-time statistics
            </div>
          </div>
          <button className={styles.drawerClose} onClick={onClose}><X size={18} /></button>
        </div>

        <div className={styles.drawerKpis}>
          {[
            { icon: Activity,  color: 'var(--text-muted)', val: quizStat.sessions,     lbl: 'Sessions' },
            { icon: Users,     color: '#3b82f6',            val: quizStat.participants, lbl: 'Students' },
            { icon: Trophy,    color: '#f59e0b',            val: quizStat.avgScore,     lbl: 'Avg Score' },
            { icon: Target,    color: accColor(quizStat.accuracy), val: `${quizStat.accuracy}%`, lbl: 'Accuracy', valColor: accColor(quizStat.accuracy) },
          ].map(({ icon: Icon, color: ic, val, lbl, valColor }, i, arr) => (
            <>
              <div key={lbl} className={styles.drawerKpi}>
                <Icon size={14} color={ic} />
                <span className={styles.drawerKpiVal} style={valColor ? { color: valColor } : {}}>{val}</span>
                <span className={styles.drawerKpiLbl}>{lbl}</span>
              </div>
              {i < arr.length - 1 && <div key={`d${i}`} className={styles.drawerKpiDivider} />}
            </>
          ))}
        </div>

        <div className={styles.drawerSectionLabel}>
          Sessions run with this quiz
          <span className={styles.drawerSectionCount}>{quizSessions.length}</span>
        </div>

        <div className={styles.drawerBody}>
          {quizSessions.length === 0
            ? <div className={styles.drawerEmpty}>No sessions yet</div>
            : (
              <div className={styles.quizSessionList}>
                {quizSessions.map((s, i) => (
                  <button key={s.id} className={styles.quizSessionRow}
                    onClick={() => { onClose(); setTimeout(() => onSessionClick(s), 50) }}>
                    <div className={styles.quizSessionLeft}>
                      <span className={styles.quizSessionNum}>#{i + 1}</span>
                      <div>
                        <div className={styles.quizSessionDate}>
                          {fmtDate(s.created_at)} · {fmtTime(s.created_at)}
                          {fmtDur(s.started_at || s.created_at, s.ended_at) &&
                            ` · ${fmtDur(s.started_at || s.created_at, s.ended_at)}`}
                        </div>
                        <div className={styles.quizSessionStats}>
                          <span><Users size={11} /> {s.participant_count} students</span>
                          <span><Trophy size={11} /> top {s.top_score} pts</span>
                          <span style={{ color: accColor(s.accuracy) }}>{s.accuracy}% acc</span>
                        </div>
                      </div>
                    </div>
                    <div className={styles.quizSessionRight}>
                      <span className={`${styles.statusPill} ${s.status === 'ended' ? styles.statusEnded : styles.statusLive}`}>
                        {s.status === 'ended' ? 'Ended' : 'Live'}
                      </span>
                      <ChevronRight size={14} color="var(--text-muted)" />
                    </div>
                  </button>
                ))}
              </div>
            )}
        </div>
      </div>
    </>
  )
}

// ── Clickable Session Row ─────────────────────────────────────────────────────
function SessionRow({ session, rank, onClick }) {
  const dur = fmtDur(session.started_at || session.created_at, session.ended_at)
  return (
    <button className={`${styles.sessionRow} ${styles.sessionRowClickable}`} onClick={onClick}>
      <div className={styles.sessionRank}>#{rank}</div>
      <div className={styles.sessionInfo}>
        <div className={styles.sessionTitle}>{session.quiz_title || 'Untitled Quiz'}</div>
        <div className={styles.sessionMeta}>
          <span>{fmtDate(session.created_at)} at {fmtTime(session.created_at)}</span>
          {dur && <span>· {dur}</span>}
        </div>
      </div>
      <div className={styles.sessionStats}>
        <div className={styles.sessionStat}><Users size={12} />{session.participant_count ?? '—'}</div>
        <div className={styles.sessionStat}><Trophy size={12} />{session.top_score ?? '—'} pts</div>
      </div>
      <div className={`${styles.sessionStatus} ${session.status === 'ended' ? styles.statusEnded : styles.statusLive}`}>
        {session.status === 'ended' ? 'Ended' : 'Live'}
      </div>
      <ChevronRight size={14} color="var(--text-muted)" />
    </button>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ReportsPage({ onNavigate }) {
  const { user } = useAuth()
  const [loading,        setLoading]        = useState(true)
  const [sessions,       setSessions]       = useState([])
  const [quizStats,      setQuizStats]      = useState([])
  const [overview,       setOverview]       = useState({ totalSessions: 0, totalParticipants: 0, avgScore: 0, avgAccuracy: 0, topQuiz: null, recentTrend: 0 })
  const [weeklyData,     setWeeklyData]     = useState([])
  const [activeTab,      setActiveTab]      = useState('overview')
  const [selectedSession,setSelectedSession]= useState(null)
  const [selectedQuiz,   setSelectedQuiz]   = useState(null)

  useEffect(() => { if (user) loadData() }, [user])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: rawSessions } = await supabase
        .from('sessions').select('*, quizzes(title, subject)')
        .eq('teacher_id', user.id).order('created_at', { ascending: false }).limit(50)
      if (!rawSessions) { setLoading(false); return }

      const ids = rawSessions.map(s => s.id)
      const [{ data: participants }, { data: answers }] = await Promise.all([
        supabase.from('participants').select('session_id, score, name').in('session_id', ids),
        supabase.from('answers').select('session_id, is_correct').in('session_id', ids),
      ])

      const enriched = rawSessions.map(s => {
        const pList = (participants || []).filter(p => p.session_id === s.id)
        const aList = (answers || []).filter(a => a.session_id === s.id)
        const corr  = aList.filter(a => a.is_correct).length
        return {
          ...s,
          quiz_title:        s.quizzes?.title,
          quiz_subject:      s.quizzes?.subject,
          participant_count: pList.length,
          top_score:         pList.length ? Math.max(...pList.map(p => p.score)) : 0,
          avg_score:         pList.length ? Math.round(pList.reduce((s, p) => s + p.score, 0) / pList.length) : 0,
          accuracy:          aList.length ? Math.round((corr / aList.length) * 100) : 0,
          correct_answers:   corr,
          total_answers:     aList.length,
        }
      })
      setSessions(enriched)

      // Overview
      const totalP   = enriched.reduce((s, e) => s + e.participant_count, 0)
      const allScores = enriched.flatMap(s => (participants || []).filter(p => p.session_id === s.id).map(p => p.score))
      const avgS     = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0
      const allAns   = answers || []
      const avgAcc   = allAns.length ? Math.round((allAns.filter(a => a.is_correct).length / allAns.length) * 100) : 0

      const qMap = {}
      enriched.forEach(s => {
        const k = s.quiz_title || 'Unknown'
        if (!qMap[k]) qMap[k] = { title: k, sessions: 0, participants: 0 }
        qMap[k].sessions++; qMap[k].participants += s.participant_count
      })
      const topQuiz = Object.values(qMap).sort((a, b) => b.participants - a.participants)[0]
      const now = Date.now(), wk = 7 * 24 * 60 * 60 * 1000
      const rP  = enriched.filter(s => now - new Date(s.created_at) < wk).reduce((s, e) => s + e.participant_count, 0)
      const pP  = enriched.filter(s => { const a = now - new Date(s.created_at); return a >= wk && a < 2*wk }).reduce((s, e) => s + e.participant_count, 0)
      setOverview({ totalSessions: enriched.length, totalParticipants: totalP, avgScore: avgS, avgAccuracy: avgAcc, topQuiz, recentTrend: pP === 0 ? 0 : Math.round(((rP - pP) / pP) * 100) })

      const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
      setWeeklyData(Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i))
        return { label: days[d.getDay()], value: enriched.filter(s => new Date(s.created_at).toDateString() === d.toDateString()).length }
      }))

      const qsMap = {}
      enriched.forEach(s => {
        const k = s.quiz_title || 'Unknown'
        if (!qsMap[k]) qsMap[k] = { title: k, subject: s.quiz_subject, sessions: 0, participants: 0, totalAnswers: 0, correctAnswers: 0, scores: [] }
        qsMap[k].sessions++; qsMap[k].participants += s.participant_count
        qsMap[k].totalAnswers += s.total_answers; qsMap[k].correctAnswers += s.correct_answers
        if (s.avg_score) qsMap[k].scores.push(s.avg_score)
      })
      setQuizStats(Object.values(qsMap).map(q => ({
        ...q,
        accuracy: q.totalAnswers ? Math.round((q.correctAnswers / q.totalAnswers) * 100) : 0,
        avgScore: q.scores.length ? Math.round(q.scores.reduce((a, b) => a + b, 0) / q.scores.length) : 0,
      })).sort((a, b) => b.participants - a.participants))
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const TrendIcon = overview.recentTrend > 0 ? ArrowUpRight : overview.recentTrend < 0 ? ArrowDownRight : Minus
  const trendColor = overview.recentTrend > 0 ? '#22c55e' : overview.recentTrend < 0 ? '#ef4444' : '#6b7280'

  if (loading) return (
    <div className={styles.loadingScreen}>
      <div className={styles.loadingSpinner} />
      <p>Loading analytics...</p>
    </div>
  )

  if (sessions.length === 0) return (
    <div className={styles.emptyScreen}>
      <div className={styles.emptyIcon}><BarChart2 size={36} /></div>
      <h2>No sessions yet</h2>
      <p>Launch a quiz to start seeing reports and analytics here.</p>
      <button className={styles.emptyBtn} onClick={() => onNavigate?.('dashboard')}>
        <Zap size={15} /> Go to Dashboard
      </button>
    </div>
  )

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.tabs}>
          {['overview','sessions','quizzes'].map(t => (
            <button key={t} className={`${styles.tab} ${activeTab === t ? styles.tabActive : ''}`} onClick={() => setActiveTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className={styles.content}>
          <div className={styles.kpiRow}>
            {[
              { icon: Activity, bg:'rgba(34,197,94,0.12)',  color:'#22c55e', val: overview.totalSessions,    lbl:'Total Sessions',    trend: true },
              { icon: Users,    bg:'rgba(59,130,246,0.12)', color:'#3b82f6', val: overview.totalParticipants, lbl:'Students Reached' },
              { icon: Trophy,   bg:'rgba(245,158,11,0.12)', color:'#f59e0b', val: overview.avgScore,          lbl:'Avg. Score' },
              { icon: Target,   bg:'rgba(139,92,246,0.12)', color:'#8b5cf6', val:`${overview.avgAccuracy}%`,  lbl:'Avg. Accuracy' },
            ].map(({ icon: Icon, bg, color, val, lbl, trend }) => (
              <div key={lbl} className={styles.kpiCard}>
                <div className={styles.kpiIcon} style={{ background: bg, color }}><Icon size={18} /></div>
                <div className={styles.kpiBody}>
                  <div className={styles.kpiValue}>{val}</div>
                  <div className={styles.kpiLabel}>{lbl}</div>
                </div>
                {trend && (
                  <div className={styles.kpiTrend} style={{ color: trendColor }}>
                    <TrendIcon size={14} />{Math.abs(overview.recentTrend)}%
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className={styles.chartsRow}>
            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <div className={styles.chartTitle}><Calendar size={15} />Sessions This Week</div>
                <div className={styles.chartSubtitle}>{weeklyData.reduce((s, d) => s + d.value, 0)} total</div>
              </div>
              {weeklyData.some(d => d.value > 0) ? <MiniBarChart data={weeklyData} /> : <div className={styles.chartEmpty}>No sessions this week</div>}
            </div>

            <div className={styles.chartCard} style={{ alignItems:'center' }}>
              <div className={styles.chartHeader}>
                <div className={styles.chartTitle}><Target size={15} />Overall Accuracy</div>
              </div>
              <DonutChart correct={sessions.reduce((s,e)=>s+e.correct_answers,0)} total={sessions.reduce((s,e)=>s+e.total_answers,0)} />
              <p className={styles.donutCaption}>
                {sessions.reduce((s,e)=>s+e.correct_answers,0).toLocaleString()} correct of{' '}
                {sessions.reduce((s,e)=>s+e.total_answers,0).toLocaleString()} answers
              </p>
            </div>

            {overview.topQuiz && (
              <div className={styles.chartCard}>
                <div className={styles.chartHeader}>
                  <div className={styles.chartTitle}><Award size={15} />Most Popular Quiz</div>
                </div>
                <div className={styles.topQuizBody}>
                  <div className={styles.topQuizName}>{overview.topQuiz.title}</div>
                  <div className={styles.topQuizStats}>
                    <div className={styles.topQuizStat}>
                      <span className={styles.topQuizStatVal}>{overview.topQuiz.sessions}</span>
                      <span className={styles.topQuizStatLabel}>sessions</span>
                    </div>
                    <div className={styles.topQuizDivider} />
                    <div className={styles.topQuizStat}>
                      <span className={styles.topQuizStatVal}>{overview.topQuiz.participants}</span>
                      <span className={styles.topQuizStatLabel}>students</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={styles.listCard}>
            <div className={styles.listCardHeader}>
              <h3 className={styles.listCardTitle}>Recent Sessions</h3>
              <button className={styles.listCardMore} onClick={() => setActiveTab('sessions')}>
                View All <ChevronRight size={14} />
              </button>
            </div>
            <div className={styles.sessionList}>
              {sessions.slice(0, 5).map((s, i) => (
                <SessionRow key={s.id} session={s} rank={i+1} onClick={() => setSelectedSession(s)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SESSIONS TAB ── */}
      {activeTab === 'sessions' && (
        <div className={styles.content}>
          <div className={styles.listCard}>
            <div className={styles.listCardHeader}>
              <h3 className={styles.listCardTitle}>All Sessions</h3>
              <span className={styles.listCardCount}>{sessions.length} total</span>
            </div>
            <div className={styles.tableHeader}>
              <span>#</span><span>Quiz</span><span>Date</span>
              <span>Students</span><span>Top Score</span><span>Accuracy</span><span>Status</span>
            </div>
            <div className={styles.tableBody}>
              {sessions.map((s, i) => {
                const color = accColor(s.accuracy)
                return (
                  <div key={s.id} className={`${styles.tableRow} ${styles.tableRowClickable}`}
                    onClick={() => setSelectedSession(s)}>
                    <span className={styles.tableRank}>#{i+1}</span>
                    <div className={styles.tableQuiz}>
                      <span className={styles.tableQuizTitle}>{s.quiz_title || '—'}</span>
                      {s.quiz_subject && (
                        <span className={styles.tableSubject}
                          style={{ background:(SUBJECT_COLORS[s.quiz_subject]||'#6b7280')+'22', color:SUBJECT_COLORS[s.quiz_subject]||'#6b7280' }}>
                          {s.quiz_subject}
                        </span>
                      )}
                    </div>
                    <span className={styles.tableDate}>{fmtDate(s.created_at)}</span>
                    <span className={styles.tableCell}><Users size={12} /> {s.participant_count}</span>
                    <span className={styles.tableCell}><Trophy size={12} /> {s.top_score}</span>
                    <span className={styles.tableCell}>
                      <div className={styles.accuracyBar}><div className={styles.accuracyFill} style={{ width:`${s.accuracy}%`, background:color }} /></div>
                      <span style={{ color }}>{s.accuracy}%</span>
                    </span>
                    <span className={`${styles.statusPill} ${s.status==='ended'?styles.statusEnded:styles.statusLive}`}>
                      {s.status==='ended'?'Ended':'Live'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── QUIZZES TAB ── */}
      {activeTab === 'quizzes' && (
        <div className={styles.content}>
          <div className={styles.quizStatsGrid}>
            {quizStats.map((q, i) => {
              const color    = SUBJECT_COLORS[q.subject] || '#6b7280'
              const accC     = accColor(q.accuracy)
              return (
                <button key={i} className={styles.quizStatCard} onClick={() => setSelectedQuiz(q)}>
                  <div className={styles.quizStatHeader}>
                    {q.subject && <span className={styles.quizStatSubject} style={{ background:color+'22', color, borderColor:color+'44' }}>{q.subject}</span>}
                    <span className={styles.quizStatRank}>#{i+1}</span>
                  </div>
                  <h3 className={styles.quizStatTitle}>{q.title}</h3>
                  <div className={styles.quizStatRow}>
                    {[{val:q.sessions,lbl:'Sessions'},{val:q.participants,lbl:'Students'},{val:q.avgScore,lbl:'Avg Score'}].map(({val,lbl})=>(
                      <div key={lbl} className={styles.quizStatItem}>
                        <span className={styles.quizStatVal}>{val}</span>
                        <span className={styles.quizStatLbl}>{lbl}</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.quizStatAccuracy}>
                    <div className={styles.quizStatAccuracyBar}><div className={styles.quizStatAccuracyFill} style={{ width:`${q.accuracy}%`, background:accC }} /></div>
                    <span className={styles.quizStatAccuracyPct} style={{ color:accC }}>{q.accuracy}% accuracy</span>
                  </div>
                  <div className={styles.quizStatFooter}><span>View all sessions</span><ChevronRight size={13} /></div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Drawers ── */}
      {selectedSession && (
        <SessionDetailDrawer session={selectedSession} onClose={() => setSelectedSession(null)} />
      )}
      {selectedQuiz && (
        <QuizDetailDrawer
          quizStat={selectedQuiz}
          sessions={sessions}
          onClose={() => setSelectedQuiz(null)}
          onSessionClick={s => setSelectedSession(s)}
        />
      )}
    </div>
  )
}