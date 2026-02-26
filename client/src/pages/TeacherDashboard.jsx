import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import {
  Zap, LayoutDashboard, BookOpen, BarChart2, Sparkles,
  Settings, LogOut, Plus, Search, MoreVertical, Play,
  Edit3, Trash2, ChevronRight, Users, FileText, Clock,
  X, Check, AlertCircle, GripVertical, ChevronDown
} from 'lucide-react'
import styles from './TeacherDashboard.module.css'
import EditQuizModal from './EditQuizModal' 

// ─── Create Quiz Modal ──────────────────────────────────────────────────────
function CreateQuizModal({ onClose, onCreated }) {
  const { user } = useAuth()
  const [step, setStep] = useState(1) // 1: details, 2: questions
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')

  const [questions, setQuestions] = useState([
    { text: '', options: ['', '', '', ''], correct: 0 }
  ])

  const subjectColors = {
    Physics: '#f59e0b', Chemistry: '#ef4444', Biology: '#22c55e',
    Mathematics: '#3b82f6', History: '#8b5cf6', Geography: '#06b6d4',
    English: '#ec4899', Computer: '#f97316', Economics: '#14b8a6',
    Other: '#6b7280'
  }

  const addQuestion = () => {
    setQuestions(q => [...q, { text: '', options: ['', '', '', ''], correct: 0 }])
  }

  const removeQuestion = (i) => {
    if (questions.length === 1) return
    setQuestions(q => q.filter((_, idx) => idx !== i))
  }

  const updateQuestion = (i, field, value) => {
    setQuestions(q => q.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  const updateOption = (qi, oi, value) => {
    setQuestions(q => q.map((item, idx) => {
      if (idx !== qi) return item
      const opts = [...item.options]
      opts[oi] = value
      return { ...item, options: opts }
    }))
  }

  const handleNext = () => {
    if (!title.trim()) { setError('Please enter a quiz title'); return }
    if (!subject) { setError('Please select a subject'); return }
    setError('')
    setStep(2)
  }

  const handleSave = async () => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.text.trim()) { setError(`Question ${i + 1} is empty`); return }
      if (q.options.some(o => !o.trim())) { setError(`Fill all options for question ${i + 1}`); return }
    }
    setError('')
    setSaving(true)
    try {
      const { data: quiz, error: qError } = await supabase
        .from('quizzes')
        .insert({ title, subject, description, teacher_id: user.id, status: 'draft' })
        .select()
        .single()
      if (qError) throw qError

      const questionRows = questions.map((q, i) => ({
        quiz_id: quiz.id,
        text: q.text,
        options: q.options,
        correct_index: q.correct,
        order_index: i,
      }))
      const { error: questErr } = await supabase.from('questions').insert(questionRows)
      if (questErr) throw questErr

      onCreated(quiz)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save quiz')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.modalSteps}>
            <div className={`${styles.modalStep} ${step >= 1 ? styles.stepActive : ''}`}>
              <span>1</span> Quiz Details
            </div>
            <ChevronRight size={14} color="var(--text-muted)" />
            <div className={`${styles.modalStep} ${step >= 2 ? styles.stepActive : ''}`}>
              <span>2</span> Questions
            </div>
          </div>
          <button className={styles.modalClose} onClick={onClose}><X size={18} /></button>
        </div>

        <div className={styles.modalBody}>
          {step === 1 ? (
            <div className={styles.detailsForm}>
              <h2 className={styles.modalTitle}>Create New Quiz</h2>
              <p className={styles.modalSubtitle}>Set up the basics before adding questions</p>
              {error && <div className={styles.formError}><AlertCircle size={14} />{error}</div>}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Quiz Title *</label>
                <input
                  className={styles.formInput}
                  placeholder="e.g. Chapter 5 - Thermodynamics"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Subject *</label>
                <div className={styles.subjectGrid}>
                  {Object.keys(subjectColors).map(s => (
                    <button
                      key={s}
                      className={`${styles.subjectChip} ${subject === s ? styles.subjectSelected : ''}`}
                      style={subject === s ? { borderColor: subjectColors[s], background: subjectColors[s] + '22', color: subjectColors[s] } : {}}
                      onClick={() => setSubject(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                <textarea
                  className={styles.formTextarea}
                  placeholder="Brief description of what this quiz covers..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <button className={styles.primaryBtn} onClick={handleNext}>
                Continue to Questions <ChevronRight size={16} />
              </button>
            </div>
          ) : (
            <div className={styles.questionsForm}>
              <div className={styles.questionsHeader}>
                <div>
                  <h2 className={styles.modalTitle}>Add Questions</h2>
                  <p className={styles.modalSubtitle}>{questions.length} question{questions.length !== 1 ? 's' : ''} · {title}</p>
                </div>
                <button className={styles.addQuestionBtn} onClick={addQuestion}>
                  <Plus size={15} /> Add Question
                </button>
              </div>
              {error && <div className={styles.formError}><AlertCircle size={14} />{error}</div>}
              <div className={styles.questionsList}>
                {questions.map((q, qi) => (
                  <div key={qi} className={styles.questionCard}>
                    <div className={styles.questionCardHeader}>
                      <div className={styles.questionNum}>Q{qi + 1}</div>
                      <button className={styles.removeQBtn} onClick={() => removeQuestion(qi)} disabled={questions.length === 1}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <textarea
                      className={styles.questionInput}
                      placeholder={`Enter question ${qi + 1}...`}
                      value={q.text}
                      onChange={e => updateQuestion(qi, 'text', e.target.value)}
                      rows={2}
                    />
                    <div className={styles.optionsList}>
                      {q.options.map((opt, oi) => (
                        <div key={oi} className={`${styles.optionRow} ${q.correct === oi ? styles.optionCorrect : ''}`}>
                          <button
                            className={`${styles.correctToggle} ${q.correct === oi ? styles.correctActive : ''}`}
                            onClick={() => updateQuestion(qi, 'correct', oi)}
                            title="Mark as correct answer"
                          >
                            <Check size={12} />
                          </button>
                          <input
                            className={styles.optionInput}
                            placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                            value={opt}
                            onChange={e => updateOption(qi, oi, e.target.value)}
                          />
                          <span className={styles.optionLabel}>{String.fromCharCode(65 + oi)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.secondaryBtn} onClick={() => setStep(1)}>← Back</button>
                <button className={styles.primaryBtn} onClick={handleSave} disabled={saving}>
                  {saving ? <div className={styles.btnSpinner} /> : <><Check size={15} /> Save Quiz</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Subject Badge ───────────────────────────────────────────────────────────
const SUBJECT_COLORS = {
  Physics: '#f59e0b', Chemistry: '#ef4444', Biology: '#22c55e',
  Mathematics: '#3b82f6', History: '#8b5cf6', Geography: '#06b6d4',
  English: '#ec4899', Computer: '#f97316', Economics: '#14b8a6', Other: '#6b7280'
}

function SubjectBadge({ subject }) {
  const color = SUBJECT_COLORS[subject] || SUBJECT_COLORS.Other
  return (
    <span className={styles.subjectBadge} style={{ background: color + '22', color, borderColor: color + '44' }}>
      {subject}
    </span>
  )
}

// ─── Quiz Card ───────────────────────────────────────────────────────────────
function QuizCard({ quiz, onDelete, onEdit }) { // Added onEdit prop
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  
  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date)
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days} days ago`
  }

  return (
    <div className={styles.quizCard}>
      <div className={styles.quizCardTop}>
        <SubjectBadge subject={quiz.subject} />
        <div className={styles.quizCardMenu}>
          <button className={styles.menuBtn} onClick={() => setMenuOpen(!menuOpen)}>
            <MoreVertical size={15} />
          </button>
          {menuOpen && (
            <div className={styles.menuDropdown}>
              {/* Trigger the edit modal */}
              <button className={styles.menuItem} onClick={() => { onEdit(quiz); setMenuOpen(false); }}>
                <Edit3 size={13} /> Edit
              </button>
              <button className={styles.menuItem} style={{ color: '#f87171' }} onClick={() => { onDelete(quiz.id); setMenuOpen(false) }}>
                <Trash2 size={13} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
      <h3 className={styles.quizCardTitle}>{quiz.title}</h3>
      {quiz.description && <p className={styles.quizCardDesc}>{quiz.description}</p>}
      <div className={styles.quizCardMeta}>
        <span><FileText size={12} /> {quiz.question_count || 0} Qs</span>
        <span><Clock size={12} /> {timeAgo(quiz.created_at)}</span>
        <span className={`${styles.statusDot} ${quiz.status === 'draft' ? styles.statusDraft : styles.statusLive}`}>
          {quiz.status === 'draft' ? 'Draft' : 'Live'}
        </span>
      </div>
      <button className={styles.playBtn} onClick={() => navigate(`/host/${quiz.id}`)}>
        <Play size={13} fill="currentColor" /> Launch Quiz
      </button>
    </div>
  )
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function TeacherDashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingQuiz, setEditingQuiz] = useState(null) // State for the quiz being edited
  const [searchQuery, setSearchQuery] = useState('')
  const [activeNav, setActiveNav] = useState('dashboard')

  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Teacher'
  const firstName = fullName.split(' ')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

  useEffect(() => {
    fetchQuizzes()
  }, [user])

  const fetchQuizzes = async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('quizzes')
      .select('*, questions(count)')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      const withCount = data.map(q => ({
        ...q,
        question_count: q.questions?.[0]?.count || 0
      }))
      setQuizzes(withCount)
    }
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this quiz?')) return
    await supabase.from('quizzes').delete().eq('id', id)
    setQuizzes(q => q.filter(quiz => quiz.id !== id))
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const filteredQuizzes = quizzes.filter(q =>
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalQuestions = quizzes.reduce((sum, q) => sum + (q.question_count || 0), 0)

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'quizzes', icon: BookOpen, label: 'My Quizzes' },
    { id: 'reports', icon: BarChart2, label: 'Reports' },
    { id: 'ai', icon: Sparkles, label: 'AI Generator', badge: true },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <div className={styles.logoIcon}><Zap size={15} fill="currentColor" /></div>
          <span className={styles.logoText}>QuizSync</span>
          <span className={styles.logoRole}>Teacher</span>
        </div>
        <nav className={styles.sidebarNav}>
          {navItems.map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                className={`${styles.navItem} ${activeNav === item.id ? styles.navItemActive : ''}`}
                onClick={() => setActiveNav(item.id)}
              >
                <Icon size={17} />
                <span>{item.label}</span>
                {item.badge && <span className={styles.navBadge}>Soon</span>}
              </button>
            )
          })}
        </nav>
        <div className={styles.sidebarBottom}>
          <button className={styles.createQuizSideBtn} onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Create Quiz
          </button>
          <div className={styles.sidebarUser}>
            <div className={styles.userAvatar}>{fullName.charAt(0).toUpperCase()}</div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{fullName}</div>
              <div className={styles.userEmail}>{user?.email}</div>
            </div>
            <button className={styles.signOutIcon} onClick={handleSignOut} title="Sign Out">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.pageTitle}>{greeting}, {firstName}.</h1>
            <p className={styles.pageSubtitle}>Here's what's happening in your classroom today.</p>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.searchBar}>
              <Search size={15} color="var(--text-muted)" />
              <input
                className={styles.searchInput}
                placeholder="Search quizzes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </header>

        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}><BookOpen size={18} /></div>
            <div><div className={styles.statValue}>{quizzes.length}</div><div className={styles.statLabel}>Total Quizzes</div></div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}><FileText size={18} /></div>
            <div><div className={styles.statValue}>{totalQuestions}</div><div className={styles.statLabel}>Total Questions</div></div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}><BarChart2 size={18} /></div>
            <div><div className={styles.statValue}>{quizzes.filter(q => q.status === 'live').length}</div><div className={styles.statLabel}>Active Quizzes</div></div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}><Clock size={18} /></div>
            <div><div className={styles.statValue}>{quizzes.filter(q => q.status === 'draft').length}</div><div className={styles.statLabel}>Drafts</div></div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recent Quizzes</h2>
            {quizzes.length > 0 && <button className={styles.viewAllBtn}>View All <ChevronRight size={14} /></button>}
          </div>

          {loading ? (
            <div className={styles.loadingGrid}>{[1, 2, 3].map(i => <div key={i} className={styles.skeletonCard} />)}</div>
          ) : filteredQuizzes.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}><BookOpen size={32} /></div>
              <h3>{searchQuery ? 'No quizzes match your search' : 'No quizzes yet'}</h3>
              {!searchQuery && <button className={styles.primaryBtn} onClick={() => setShowCreateModal(true)}><Plus size={15} /> Create Your First Quiz</button>}
            </div>
          ) : (
            <div className={styles.quizzesGrid}>
              <button className={styles.createTile} onClick={() => setShowCreateModal(true)}>
                <div className={styles.createTileIcon}><Plus size={22} /></div>
                <span>Create New Quiz</span>
              </button>
              {filteredQuizzes.map(quiz => (
                <QuizCard 
                  key={quiz.id} 
                  quiz={quiz} 
                  onDelete={handleDelete} 
                  onEdit={setEditingQuiz} // Pass the edit handler
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Render Create Modal */}
      {showCreateModal && (
        <CreateQuizModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { fetchQuizzes(); setShowCreateModal(false); }}
        />
      )}

      {/* Render Edit Modal */}
      {editingQuiz && (
        <EditQuizModal
          quiz={editingQuiz}
          onClose={() => setEditingQuiz(null)}
          onSaved={() => { fetchQuizzes(); setEditingQuiz(null); }}
        />
      )}
    </div>
  )
}