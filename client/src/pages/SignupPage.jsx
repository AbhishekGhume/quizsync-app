import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Zap, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import styles from './AuthPage.module.css'

export default function SignupPage() {
  const { signUp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    const { data, error } = await signUp(email, password, fullName)
    setLoading(false)
    if (error) {
      setError(error.message)
    } else if (data?.user && !data?.session) {
      setSuccess(true) // Email confirmation required
    } else {
      navigate('/dashboard')
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    const { error } = await signInWithGoogle()
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.bgBlob} />
        <Link to="/" className={styles.logoLink}>
          <div className={styles.logoIcon}><Zap size={16} fill="currentColor" /></div>
          <span className={styles.logoText}>QuizSync</span>
        </Link>
        <div className={styles.card}>
          <div className={styles.successState}>
            <div className={styles.successIcon}><CheckCircle size={40} /></div>
            <h2 className={styles.title}>Check your email!</h2>
            <p className={styles.subtitle}>
              We've sent a confirmation link to <strong>{email}</strong>.<br />
              Click it to activate your account.
            </p>
            <Link to="/login" className={styles.submitBtn} style={{ textDecoration: 'none', textAlign: 'center', display: 'block', marginTop: '8px' }}>
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.bgBlob} />
      <div className={styles.bgGrid} />

      <Link to="/" className={styles.logoLink}>
        <div className={styles.logoIcon}><Zap size={16} fill="currentColor" /></div>
        <span className={styles.logoText}>QuizSync</span>
      </Link>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h1 className={styles.title}>Create your account</h1>
          <p className={styles.subtitle}>Start conducting smarter assessments today</p>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <button
          className={styles.googleBtn}
          onClick={handleGoogle}
          disabled={googleLoading}
        >
          {googleLoading ? (
            <div className={styles.spinner} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
          )}
          Continue with Google
        </button>

        <div className={styles.divider}>
          <span>or sign up with email</span>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Full name</label>
            <input
              type="text"
              className={styles.input}
              placeholder="Dr. Abhishek Sharma"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Email address</label>
            <input
              type="email"
              className={styles.input}
              placeholder="you@university.edu"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <div className={styles.passwordWrap}>
              <input
                type={showPassword ? 'text' : 'password'}
                className={styles.input}
                placeholder="Min. 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className={styles.passwordStrength}>
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`${styles.strengthBar} ${password.length > i * 3 ? styles.active : ''}`}
                />
              ))}
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <div className={styles.spinner} /> : 'Create Account'}
          </button>
        </form>

        <p className={styles.termsText}>
          By signing up you agree to our{' '}
          <a href="#" className={styles.switchLink}>Terms</a> and{' '}
          <a href="#" className={styles.switchLink}>Privacy Policy</a>.
        </p>

        <p className={styles.switchText}>
          Already have an account?{' '}
          <Link to="/login" className={styles.switchLink}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}