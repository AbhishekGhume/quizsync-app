import { useState } from "react";
import styles from "./AIGeneratorModal.module.css";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const DIFFICULTY_OPTIONS = ["Easy", "Medium", "Hard", "Mixed"];
const GRADE_OPTIONS = [
  "Grade 1–3",
  "Grade 4–6",
  "Grade 7–8",
  "Grade 9–10",
  "Grade 11–12",
  "College",
  "Professional",
];
const COUNT_OPTIONS = [5, 10, 15, 20];

export default function AIGeneratorModal({ onClose, onSaveQuiz }) {
  const [step, setStep] = useState("config"); // config | generating | review
  const [config, setConfig] = useState({
    subject: "",
    topic: "",
    grade: "Grade 7–8",
    difficulty: "Medium",
    count: 10,
    extraNotes: "",
  });
  const [questions, setQuestions] = useState([]);
  const [editingIdx, setEditingIdx] = useState(null);
  const [error, setError] = useState("");
  const [quizTitle, setQuizTitle] = useState("");

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  const buildPrompt = () => `
You are a quiz generator. Create exactly ${config.count} multiple-choice questions for a quiz.

Subject: ${config.subject}
Topic: ${config.topic}
Grade level: ${config.grade}
Difficulty: ${config.difficulty}
${config.extraNotes ? `Extra context: ${config.extraNotes}` : ""}

Return ONLY a valid JSON array (no markdown, no explanation) in this exact format:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": 0,
    "explanation": "Brief explanation of why this is correct."
  }
]

Rules:
- "answer" is the 0-based index of the correct option
- All 4 options must be plausible
- Questions must match the grade level and difficulty
- Do NOT include any text outside the JSON array
`;

  const generate = async () => {
    if (!config.subject.trim() || !config.topic.trim()) {
      setError("Please fill in Subject and Topic.");
      return;
    }
    if (!apiKey) {
      setError(
        "Gemini API key not found. Add VITE_GEMINI_API_KEY to your .env file."
      );
      return;
    }

    setError("");
    setStep("generating");

    try {
      const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt() }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Gemini API error");
      }

      const data = await res.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Strip possible markdown fences
      const cleaned = raw
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("Invalid response format from Gemini.");
      }

      setQuestions(parsed);
      setQuizTitle(`${config.subject}: ${config.topic}`);
      setStep("review");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setStep("config");
    }
  };

  const updateQuestion = (idx, field, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q))
    );
  };

  const updateOption = (qIdx, oIdx, value) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? {
              ...q,
              options: q.options.map((o, j) => (j === oIdx ? value : o)),
            }
          : q
      )
    );
  };

  const deleteQuestion = (idx) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    if (!quizTitle.trim()) {
      setError("Please enter a quiz title.");
      return;
    }
    onSaveQuiz({
      title: quizTitle,
      questions: questions.map((q) => ({
        question: q.question,
        options: q.options,
        answer: q.answer,
      })),
    });
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.sparkIcon}>✦</span>
            <h2>AI Quiz Generator</h2>
            {step === "review" && (
              <span className={styles.badge}>{questions.length} questions</span>
            )}
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Step: Config */}
        {step === "config" && (
          <div className={styles.body}>
            <div className={styles.grid2}>
              <div className={styles.field}>
                <label>Subject *</label>
                <input
                  type="text"
                  placeholder="e.g. Biology, History, Math"
                  value={config.subject}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, subject: e.target.value }))
                  }
                />
              </div>
              <div className={styles.field}>
                <label>Topic *</label>
                <input
                  type="text"
                  placeholder="e.g. Photosynthesis, World War II"
                  value={config.topic}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, topic: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className={styles.grid3}>
              <div className={styles.field}>
                <label>Grade Level</label>
                <select
                  value={config.grade}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, grade: e.target.value }))
                  }
                >
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label>Difficulty</label>
                <select
                  value={config.difficulty}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, difficulty: e.target.value }))
                  }
                >
                  {DIFFICULTY_OPTIONS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label>Number of Questions</label>
                <div className={styles.countRow}>
                  {COUNT_OPTIONS.map((n) => (
                    <button
                      key={n}
                      className={`${styles.countBtn} ${
                        config.count === n ? styles.countBtnActive : ""
                      }`}
                      onClick={() => setConfig((c) => ({ ...c, count: n }))}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.field}>
              <label>Extra Notes / Context <span className={styles.optional}>(optional)</span></label>
              <textarea
                placeholder="Paste notes, chapter summaries, or specific concepts to focus on..."
                rows={4}
                value={config.extraNotes}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, extraNotes: e.target.value }))
                }
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.footer}>
              <button className={styles.cancelBtn} onClick={onClose}>
                Cancel
              </button>
              <button className={styles.generateBtn} onClick={generate}>
                <span>✦</span> Generate Quiz
              </button>
            </div>
          </div>
        )}

        {/* Step: Generating */}
        {step === "generating" && (
          <div className={styles.loadingBody}>
            <div className={styles.spinner} />
            <p className={styles.loadingTitle}>Generating your quiz...</p>
            <p className={styles.loadingSubtitle}>
              Creating {config.count} {config.difficulty.toLowerCase()} questions
              on <strong>{config.topic}</strong>
            </p>
          </div>
        )}

        {/* Step: Review */}
        {step === "review" && (
          <div className={styles.body}>
            <div className={styles.reviewHeader}>
              <div className={styles.field} style={{ flex: 1 }}>
                <label>Quiz Title</label>
                <input
                  type="text"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                />
              </div>
              <button
                className={styles.regenBtn}
                onClick={() => setStep("config")}
              >
                ↺ Regenerate
              </button>
            </div>

            <div className={styles.questionList}>
              {questions.map((q, idx) => (
                <div key={idx} className={styles.questionCard}>
                  <div className={styles.questionCardHeader}>
                    <span className={styles.qNum}>Q{idx + 1}</span>
                    <div className={styles.qActions}>
                      <button
                        className={styles.editToggle}
                        onClick={() =>
                          setEditingIdx(editingIdx === idx ? null : idx)
                        }
                      >
                        {editingIdx === idx ? "Done" : "Edit"}
                      </button>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => deleteQuestion(idx)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {editingIdx === idx ? (
                    <div className={styles.editMode}>
                      <textarea
                        className={styles.editQuestion}
                        value={q.question}
                        onChange={(e) =>
                          updateQuestion(idx, "question", e.target.value)
                        }
                        rows={2}
                      />
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className={styles.editOptionRow}>
                          <button
                            className={`${styles.correctMark} ${
                              q.answer === oIdx ? styles.correctMarkActive : ""
                            }`}
                            onClick={() => updateQuestion(idx, "answer", oIdx)}
                            title="Mark as correct"
                          >
                            {q.answer === oIdx ? "✓" : "○"}
                          </button>
                          <input
                            value={opt}
                            onChange={(e) =>
                              updateOption(idx, oIdx, e.target.value)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.viewMode}>
                      <p className={styles.questionText}>{q.question}</p>
                      <div className={styles.options}>
                        {q.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`${styles.option} ${
                              q.answer === oIdx ? styles.optionCorrect : ""
                            }`}
                          >
                            <span className={styles.optionLetter}>
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            {opt}
                            {q.answer === oIdx && (
                              <span className={styles.correctTag}>✓ Correct</span>
                            )}
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <p className={styles.explanation}>
                          <span>💡</span> {q.explanation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.footer}>
              <button className={styles.cancelBtn} onClick={onClose}>
                Discard
              </button>
              <button className={styles.generateBtn} onClick={handleSave}>
                Save Quiz ({questions.length} questions)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}