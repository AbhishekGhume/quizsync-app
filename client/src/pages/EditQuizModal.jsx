import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  X, Plus, Trash2, GripVertical, Check, ChevronDown,
  ChevronUp, AlertCircle, Save, Loader2, BookOpen
} from 'lucide-react'
import styles from './EditQuizModal.module.css'

// ─── Drag-to-reorder hook ─────────────────────────────────────────────────────
function useDraggable(items, setItems) {
  const dragIndex = useRef(null)

  const onDragStart = (i) => { dragIndex.current = i }
  const onDragOver = (e, i) => {
    e.preventDefault()
    if (dragIndex.current === null || dragIndex.current === i) return
    const next = [...items]
    const [moved] = next.splice(dragIndex.current, 1)
    next.splice(i, 0, moved)
    dragIndex.current = i
    setItems(next)
  }
  const onDragEnd = () => { dragIndex.current = null }

  return { onDragStart, onDragOver, onDragEnd }
}

// ─── Single Question Editor ────────────────────────────────────────────────────
function QuestionEditor({ q, index, total, onChange, onRemove, draggable }) {
  const [collapsed, setCollapsed] = useState(false)
  const OPTION_COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#22c55e']
  const OPTION_LABELS = ['A', 'B', 'C', 'D']

  const hasError = !q.text.trim() || q.options.some(o => !o.trim())

  return (
    <div
      className={`${styles.questionCard} ${hasError ? styles.questionCardError : ''}`}
      draggable
      onDragStart={() => draggable.onDragStart(index)}
      onDragOver={(e) => draggable.onDragOver(e, index)}
      onDragEnd={draggable.onDragEnd}
    >
      {/* Header */}
      <div className={styles.qHeader}>
        <div className={styles.qHeaderLeft}>
          <div className={styles.dragHandle} title="Drag to reorder">
            <GripVertical size={16} />
          </div>
          <div className={styles.qNumber}>Q{index + 1}</div>
          <span className={styles.qPreview}>
            {q.text.trim() || <span className={styles.qPlaceholder}>Untitled question</span>}
          </span>
        </div>
        <div className={styles.qHeaderRight}>
          {hasError && <AlertCircle size={14} className={styles.errorIcon} />}
          <button
            className={styles.collapseBtn}
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          {total > 1 && (
            <button className={styles.removeBtn} onClick={() => onRemove(index)} title="Delete question">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className={styles.qBody}>
          <textarea
            className={styles.qTextarea}
            placeholder="Enter your question..."
            value={q.text}
            rows={2}
            onChange={e => onChange(index, 'text', e.target.value)}
          />

          <div className={styles.optionsLabel}>
            Answer Options <span className={styles.optionsHint}>· Click correct answer</span>
          </div>

          <div className={styles.optionsGrid}>
            {q.options.map((opt, oi) => (
              <div
                key={oi}
                className={`${styles.optionRow} ${q.correct_index === oi ? styles.optionRowCorrect : ''}`}
                style={{ '--option-color': OPTION_COLORS[oi] }}
              >
                <button
                  className={`${styles.optionBadge} ${q.correct_index === oi ? styles.optionBadgeActive : ''}`}
                  style={{ background: q.correct_index === oi ? OPTION_COLORS[oi] : undefined }}
                  onClick={() => onChange(index, 'correct_index', oi)}
                  title="Set as correct answer"
                >
                  {q.correct_index === oi ? <Check size={12} /> : OPTION_LABELS[oi]}
                </button>
                <input
                  className={styles.optionInput}
                  placeholder={`Option ${OPTION_LABELS[oi]}...`}
                  value={opt}
                  onChange={e => {
                    const opts = [...q.options]
                    opts[oi] = e.target.value
                    onChange(index, 'options', opts)
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function EditQuizModal({ quiz, onClose, onSaved }) {
  const [title, setTitle] = useState(quiz.title || '')
  const [subject, setSubject] = useState(quiz.subject || '')
  const [description, setDescription] = useState(quiz.description || '')
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  const draggable = useDraggable(questions, setQuestions)

  // Load existing questions
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quiz.id)
        .order('order_index')

      if (data && data.length > 0) {
        setQuestions(data.map(q => ({
          id: q.id,
          text: q.text,
          options: q.options,
          correct_index: q.correct_index,
          order_index: q.order_index,
        })))
      } else {
        // Default empty question if none exist
        setQuestions([makeBlankQuestion(0)])
      }
      setLoading(false)
    }
    load()
  }, [quiz.id])

  function makeBlankQuestion(orderIdx) {
    return {
      id: null, // null = new (not in DB yet)
      text: '',
      options: ['', '', '', ''],
      correct_index: 0,
      order_index: orderIdx,
    }
  }

  function handleQuestionChange(index, field, value) {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q))
  }

  function handleAddQuestion() {
    setQuestions(prev => [...prev, makeBlankQuestion(prev.length)])
  }

  function handleRemoveQuestion(index) {
    setQuestions(prev => prev.filter((_, i) => i !== index))
  }

  const validate = () => {
    if (!title.trim()) return 'Quiz title is required.'
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].text.trim()) return `Question ${i + 1} needs text.`
      if (questions[i].options.some(o => !o.trim())) return `Question ${i + 1} has empty options.`
    }
    return null
  }

  const handleSave = async () => {
    const err = validate()
    if (err) { setError(err); return }

    setSaving(true)
    setError(null)

    // 1. Update quiz metadata
    const { error: quizErr } = await supabase
      .from('quizzes')
      .update({ title: title.trim(), subject: subject.trim(), description: description.trim() })
      .eq('id', quiz.id)

    if (quizErr) { setError('Failed to update quiz. Please try again.'); setSaving(false); return }

    // 2. Delete all existing questions and re-insert (simplest strategy)
    await supabase.from('questions').delete().eq('quiz_id', quiz.id)

    const toInsert = questions.map((q, i) => ({
      quiz_id: quiz.id,
      text: q.text.trim(),
      options: q.options.map(o => o.trim()),
      correct_index: q.correct_index,
      order_index: i,
    }))

    const { error: qErr } = await supabase.from('questions').insert(toInsert)

    if (qErr) { setError('Failed to save questions. Please try again.'); setSaving(false); return }

    setSaved(true)
    setSaving(false)
    setTimeout(() => {
      onSaved && onSaved({ ...quiz, title, subject, description })
      onClose()
    }, 800)
  }

  const SUBJECTS = ['Mathematics', 'Science', 'English', 'History', 'Geography', 'Computer Science', 'Physics', 'Chemistry', 'Biology', 'Other']

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal}>

        {/* ── Header ── */}
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderLeft}>
            <div className={styles.modalIcon}>
              <BookOpen size={16} />
            </div>
            <div>
              <h2 className={styles.modalTitle}>Edit Quiz</h2>
              <p className={styles.modalSubtitle}>{quiz.title}</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div className={styles.modalBody}>

          {/* Quiz details section */}
          <section className={styles.section}>
            <div className={styles.sectionLabel}>Quiz Details</div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Title <span className={styles.required}>*</span></label>
              <input
                className={styles.input}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Chapter 5: Photosynthesis"
                maxLength={100}
              />
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Subject</label>
                <select
                  className={styles.select}
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                >
                  <option value="">Select subject...</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Description <span className={styles.optional}>(optional)</span></label>
              <textarea
                className={styles.textarea}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief description of what this quiz covers..."
                rows={2}
                maxLength={300}
              />
            </div>
          </section>

          {/* Questions section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionLabel}>
                Questions
                <span className={styles.qCount}>{questions.length}</span>
              </div>
              <p className={styles.sectionHint}>Drag ⠿ to reorder · Click letter badge to set correct answer</p>
            </div>

            {loading ? (
              <div className={styles.loadingQuestions}>
                <Loader2 size={20} className={styles.spinIcon} />
                <span>Loading questions...</span>
              </div>
            ) : (
              <div className={styles.questionList}>
                {questions.map((q, i) => (
                  <QuestionEditor
                    key={i}
                    q={q}
                    index={i}
                    total={questions.length}
                    onChange={handleQuestionChange}
                    onRemove={handleRemoveQuestion}
                    draggable={draggable}
                  />
                ))}
              </div>
            )}

            <button className={styles.addQuestionBtn} onClick={handleAddQuestion}>
              <Plus size={15} />
              Add Question
            </button>
          </section>
        </div>

        {/* ── Footer ── */}
        <div className={styles.modalFooter}>
          {error && (
            <div className={styles.errorBanner}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}
          <div className={styles.footerActions}>
            <button className={styles.cancelBtn} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              className={`${styles.saveBtn} ${saved ? styles.saveBtnSuccess : ''}`}
              onClick={handleSave}
              disabled={saving || saved}
            >
              {saving ? (
                <><Loader2 size={15} className={styles.spinIcon} /> Saving...</>
              ) : saved ? (
                <><Check size={15} /> Saved!</>
              ) : (
                <><Save size={15} /> Save Changes</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}