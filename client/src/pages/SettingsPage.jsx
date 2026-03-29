import { useState, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import {
  User, Lock, Bell, Palette, Shield, ChevronRight,
  Eye, EyeOff, Check, AlertCircle, Loader2, Camera,
  Mail, BookOpen, Zap, Moon, Sun, Monitor, LogOut,
  Trash2, Download, Globe, Clock, Volume2, VolumeX
} from 'lucide-react'
import styles from './SettingsPage.module.css'

// ── Toggle Switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      className={`${styles.toggle} ${checked ? styles.toggleOn : ''}`}
      onClick={() => onChange(!checked)}
      type="button"
      role="switch"
      aria-checked={checked}
    >
      <span className={styles.toggleThumb} />
    </button>
  )
}

// ── Setting Row ───────────────────────────────────────────────────────────────
function SettingRow({ icon: Icon, iconColor = 'var(--green-primary)', iconBg = 'rgba(34,197,94,0.12)', label, desc, children, danger }) {
  return (
    <div className={`${styles.settingRow} ${danger ? styles.settingRowDanger : ''}`}>
      <div className={styles.settingRowLeft}>
        {Icon && (
          <div className={styles.settingRowIcon} style={{ background: iconBg, color: iconColor }}>
            <Icon size={15} />
          </div>
        )}
        <div className={styles.settingRowText}>
          <div className={styles.settingRowLabel}>{label}</div>
          {desc && <div className={styles.settingRowDesc}>{desc}</div>}
        </div>
      </div>
      <div className={styles.settingRowRight}>{children}</div>
    </div>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{title}</div>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type }) {
  return (
    <div className={`${styles.toast} ${type === 'error' ? styles.toastError : styles.toastSuccess}`}>
      {type === 'error' ? <AlertCircle size={14} /> : <Check size={14} />}
      {message}
    </div>
  )
}

// ── Password strength ─────────────────────────────────────────────────────────
function passwordStrength(pw) {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return Math.min(score, 4)
}
const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong']
const strengthColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e']

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, signOut } = useAuth()

  // Nav
  const [activeSection, setActiveSection] = useState('profile')

  // Toast
  const [toast, setToast] = useState(null)
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Profile state ──────────────────────────────────────────────────────────
  const [fullName,     setFullName]     = useState(user?.user_metadata?.full_name || '')
  const [displayName,  setDisplayName]  = useState(user?.user_metadata?.display_name || '')
  const [institution,  setInstitution]  = useState(user?.user_metadata?.institution || '')
  const [subject,      setSubject]      = useState(user?.user_metadata?.subject || '')
  const [savingProfile,setSavingProfile]= useState(false)

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName, display_name: displayName, institution, subject }
    })
    setSavingProfile(false)
    if (error) showToast(error.message, 'error')
    else showToast('Profile updated successfully!')
  }

  // ── Password state ─────────────────────────────────────────────────────────
  const [currentPw,   setCurrentPw]   = useState('')
  const [newPw,       setNewPw]       = useState('')
  const [confirmPw,   setConfirmPw]   = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew,     setShowNew]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [savingPw,    setSavingPw]    = useState(false)

  const pwStrength = passwordStrength(newPw)

  const handleChangePassword = async () => {
    if (!newPw) { showToast('Enter a new password', 'error'); return }
    if (newPw.length < 8) { showToast('Password must be at least 8 characters', 'error'); return }
    if (newPw !== confirmPw) { showToast('Passwords do not match', 'error'); return }
    setSavingPw(true)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setSavingPw(false)
    if (error) showToast(error.message, 'error')
    else {
      showToast('Password changed successfully!')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    }
  }

  // ── Notifications state ────────────────────────────────────────────────────
  const [notifs, setNotifs] = useState({
    sessionStart:   true,
    sessionEnd:     true,
    newStudent:     false,
    weeklyReport:   true,
    productUpdates: false,
    soundEffects:   true,
  })
  const toggleNotif = key => setNotifs(n => ({ ...n, [key]: !n[key] }))

  // ── Appearance state ───────────────────────────────────────────────────────
  const [theme,    setTheme]   = useState('dark')   // dark | light | system
  const [language, setLanguage]= useState('en')
  const [timezone, setTimezone]= useState('Asia/Kolkata')
  const [density,  setDensity] = useState('comfortable') // compact | comfortable | spacious

  // ── Danger zone ────────────────────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

  const navItems = [
    { id: 'profile',      icon: User,    label: 'Profile' },
    { id: 'password',     icon: Lock,    label: 'Password' },
    { id: 'notifications',icon: Bell,    label: 'Notifications' },
    { id: 'appearance',   icon: Palette, label: 'Appearance' },
    { id: 'account',      icon: Shield,  label: 'Account & Data' },
  ]

  const firstName = (user?.user_metadata?.full_name || user?.email || 'T').split(' ')[0]
  const initials  = (user?.user_metadata?.full_name || user?.email || 'T')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className={styles.page}>
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Sidebar Nav */}
      <nav className={styles.settingsNav}>
        <div className={styles.settingsNavTitle}>Settings</div>
        {navItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={`${styles.settingsNavItem} ${activeSection === id ? styles.settingsNavItemActive : ''}`}
            onClick={() => setActiveSection(id)}
          >
            <Icon size={15} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Main Panel */}
      <div className={styles.settingsMain}>

        {/* ── PROFILE ── */}
        {activeSection === 'profile' && (
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Profile</h2>
              <p className={styles.panelSubtitle}>Manage your personal information and how others see you</p>
            </div>

            {/* Avatar */}
            <div className={styles.avatarRow}>
              <div className={styles.avatarWrap}>
                <div className={styles.avatar}>{initials}</div>
                <button className={styles.avatarEdit} title="Change photo">
                  <Camera size={13} />
                </button>
              </div>
              <div className={styles.avatarInfo}>
                <div className={styles.avatarName}>{user?.user_metadata?.full_name || firstName}</div>
                <div className={styles.avatarEmail}>{user?.email}</div>
                <div className={styles.avatarBadge}>
                  <Zap size={10} fill="currentColor" /> Teacher
                </div>
              </div>
            </div>

            <div className={styles.divider} />

            {/* Form */}
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Full Name</label>
                <input className={styles.formInput} value={fullName}
                  onChange={e => setFullName(e.target.value)} placeholder="Dr. Priya Sharma" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Display Name <span className={styles.formOptional}>(optional)</span></label>
                <input className={styles.formInput} value={displayName}
                  onChange={e => setDisplayName(e.target.value)} placeholder="How students will see you" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Email Address</label>
                <div className={styles.inputWithIcon}>
                  <Mail size={14} className={styles.inputIcon} />
                  <input className={`${styles.formInput} ${styles.formInputDisabled}`}
                    value={user?.email || ''} disabled />
                </div>
                <span className={styles.formHint}>Email cannot be changed here. Contact support.</span>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Institution / School</label>
                <input className={styles.formInput} value={institution}
                  onChange={e => setInstitution(e.target.value)} placeholder="e.g. IIT Bombay, DPS Delhi" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Primary Subject</label>
                <select className={styles.formSelect} value={subject} onChange={e => setSubject(e.target.value)}>
                  <option value="">Select subject...</option>
                  {['Mathematics','Physics','Chemistry','Biology','History','Geography','English','Computer Science','Economics','Other'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.panelFooter}>
              <button className={styles.saveBtn} onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? <><Loader2 size={14} className={styles.spinIcon} /> Saving...</> : <><Check size={14} /> Save Changes</>}
              </button>
            </div>
          </div>
        )}

        {/* ── PASSWORD ── */}
        {activeSection === 'password' && (
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Password & Security</h2>
              <p className={styles.panelSubtitle}>Keep your account secure with a strong password</p>
            </div>

            <div className={styles.securityBanner}>
              <Shield size={16} color="#22c55e" />
              <div>
                <div className={styles.securityBannerTitle}>Your account is protected</div>
                <div className={styles.securityBannerDesc}>
                  Last sign-in: {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown'}
                </div>
              </div>
            </div>

            <div className={styles.formStack}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Current Password</label>
                <div className={styles.passwordWrap}>
                  <input className={styles.formInput} type={showCurrent ? 'text' : 'password'}
                    value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                    placeholder="Enter current password" />
                  <button className={styles.eyeBtn} type="button" onClick={() => setShowCurrent(v => !v)}>
                    {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>New Password</label>
                <div className={styles.passwordWrap}>
                  <input className={styles.formInput} type={showNew ? 'text' : 'password'}
                    value={newPw} onChange={e => setNewPw(e.target.value)}
                    placeholder="Min. 8 characters" />
                  <button className={styles.eyeBtn} type="button" onClick={() => setShowNew(v => !v)}>
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {newPw && (
                  <div className={styles.strengthRow}>
                    <div className={styles.strengthBars}>
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`${styles.strengthBar} ${pwStrength >= i ? styles.strengthBarActive : ''}`}
                          style={pwStrength >= i ? { background: strengthColor[pwStrength] } : {}} />
                      ))}
                    </div>
                    <span className={styles.strengthLabel} style={{ color: strengthColor[pwStrength] }}>
                      {strengthLabel[pwStrength]}
                    </span>
                  </div>
                )}
                <div className={styles.formHint}>Use 8+ chars, uppercase, numbers, and symbols</div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Confirm New Password</label>
                <div className={styles.passwordWrap}>
                  <input className={styles.formInput} type={showConfirm ? 'text' : 'password'}
                    value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                    placeholder="Repeat new password" />
                  <button className={styles.eyeBtn} type="button" onClick={() => setShowConfirm(v => !v)}>
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {confirmPw && newPw !== confirmPw && (
                  <div className={styles.fieldError}><AlertCircle size={12} /> Passwords do not match</div>
                )}
                {confirmPw && newPw === confirmPw && newPw && (
                  <div className={styles.fieldSuccess}><Check size={12} /> Passwords match</div>
                )}
              </div>
            </div>

            <div className={styles.panelFooter}>
              <button className={styles.saveBtn} onClick={handleChangePassword} disabled={savingPw}>
                {savingPw ? <><Loader2 size={14} className={styles.spinIcon} /> Updating...</> : <><Lock size={14} /> Change Password</>}
              </button>
            </div>
          </div>
        )}

        {/* ── NOTIFICATIONS ── */}
        {activeSection === 'notifications' && (
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Notifications</h2>
              <p className={styles.panelSubtitle}>Choose what you want to be notified about</p>
            </div>

            <Section title="Quiz Sessions">
              <SettingRow icon={Zap} label="Session started" desc="When a new quiz session goes live">
                <Toggle checked={notifs.sessionStart} onChange={() => toggleNotif('sessionStart')} />
              </SettingRow>
              <SettingRow icon={Check} iconColor="#3b82f6" iconBg="rgba(59,130,246,0.12)"
                label="Session ended" desc="Summary when a session finishes">
                <Toggle checked={notifs.sessionEnd} onChange={() => toggleNotif('sessionEnd')} />
              </SettingRow>
              <SettingRow icon={User} iconColor="#8b5cf6" iconBg="rgba(139,92,246,0.12)"
                label="New student joined" desc="Real-time alert when a student joins your lobby">
                <Toggle checked={notifs.newStudent} onChange={() => toggleNotif('newStudent')} />
              </SettingRow>
            </Section>

            <Section title="Reports & Updates">
              <SettingRow icon={Bell} iconColor="#f59e0b" iconBg="rgba(245,158,11,0.12)"
                label="Weekly performance report" desc="Email digest of your week's quiz activity">
                <Toggle checked={notifs.weeklyReport} onChange={() => toggleNotif('weeklyReport')} />
              </SettingRow>
              <SettingRow icon={BookOpen} iconColor="#06b6d4" iconBg="rgba(6,182,212,0.12)"
                label="Product updates" desc="New features and announcements from QuizSync">
                <Toggle checked={notifs.productUpdates} onChange={() => toggleNotif('productUpdates')} />
              </SettingRow>
            </Section>

            <Section title="In-App">
              <SettingRow icon={notifs.soundEffects ? Volume2 : VolumeX}
                iconColor="#ec4899" iconBg="rgba(236,72,153,0.12)"
                label="Sound effects" desc="Play sounds during live quiz sessions">
                <Toggle checked={notifs.soundEffects} onChange={() => toggleNotif('soundEffects')} />
              </SettingRow>
            </Section>

            <div className={styles.panelFooter}>
              <button className={styles.saveBtn} onClick={() => showToast('Notification preferences saved!')}>
                <Check size={14} /> Save Preferences
              </button>
            </div>
          </div>
        )}

        {/* ── APPEARANCE ── */}
        {activeSection === 'appearance' && (
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Appearance</h2>
              <p className={styles.panelSubtitle}>Personalise how QuizSync looks and feels</p>
            </div>

            <Section title="Theme">
              <div className={styles.themeGrid}>
                {[
                  { id: 'dark',   icon: Moon,    label: 'Dark',   desc: 'Easy on the eyes' },
                  { id: 'light',  icon: Sun,     label: 'Light',  desc: 'Bright and clean' },
                  { id: 'system', icon: Monitor, label: 'System', desc: 'Follow OS setting' },
                ].map(({ id, icon: Icon, label, desc }) => (
                  <button key={id}
                    className={`${styles.themeOption} ${theme === id ? styles.themeOptionActive : ''}`}
                    onClick={() => setTheme(id)}>
                    <Icon size={20} />
                    <span className={styles.themeOptionLabel}>{label}</span>
                    <span className={styles.themeOptionDesc}>{desc}</span>
                    {theme === id && <div className={styles.themeCheck}><Check size={11} /></div>}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Display Density">
              <div className={styles.densityRow}>
                {[
                  { id: 'compact',      label: 'Compact',      desc: 'More content, tighter spacing' },
                  { id: 'comfortable',  label: 'Comfortable',  desc: 'Balanced — recommended' },
                  { id: 'spacious',     label: 'Spacious',     desc: 'Relaxed, more breathing room' },
                ].map(({ id, label, desc }) => (
                  <button key={id}
                    className={`${styles.densityOption} ${density === id ? styles.densityOptionActive : ''}`}
                    onClick={() => setDensity(id)}>
                    <div className={styles.densityDot} />
                    <div>
                      <div className={styles.densityLabel}>{label}</div>
                      <div className={styles.densityDesc}>{desc}</div>
                    </div>
                    {density === id && <Check size={14} className={styles.densityCheck} />}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Localisation">
              <SettingRow icon={Globe} label="Language" desc="Interface display language">
                <select className={styles.inlineSelect} value={language} onChange={e => setLanguage(e.target.value)}>
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="mr">Marathi</option>
                  <option value="ta">Tamil</option>
                  <option value="te">Telugu</option>
                </select>
              </SettingRow>
              <SettingRow icon={Clock} iconColor="#f59e0b" iconBg="rgba(245,158,11,0.12)"
                label="Timezone" desc="Used for session timestamps">
                <select className={styles.inlineSelect} value={timezone} onChange={e => setTimezone(e.target.value)}>
                  <option value="Asia/Kolkata">IST (UTC+5:30)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">EST (UTC−5)</option>
                  <option value="Europe/London">GMT (UTC+0)</option>
                  <option value="Asia/Dubai">GST (UTC+4)</option>
                </select>
              </SettingRow>
            </Section>

            <div className={styles.panelFooter}>
              <button className={styles.saveBtn} onClick={() => showToast('Appearance preferences saved!')}>
                <Check size={14} /> Save Preferences
              </button>
            </div>
          </div>
        )}

        {/* ── ACCOUNT & DATA ── */}
        {activeSection === 'account' && (
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Account & Data</h2>
              <p className={styles.panelSubtitle}>Manage your data and account settings</p>
            </div>

            <Section title="Your Data">
              <SettingRow icon={Download} iconColor="#3b82f6" iconBg="rgba(59,130,246,0.12)"
                label="Export your data"
                desc="Download all your quizzes, sessions, and results as a JSON file">
                <button className={styles.actionBtn} onClick={() => showToast('Export started — check your email shortly')}>
                  Export
                </button>
              </SettingRow>
              <SettingRow icon={Mail} iconColor="#8b5cf6" iconBg="rgba(139,92,246,0.12)"
                label="Account email"
                desc={user?.email || 'Not set'}>
                <span className={styles.accountEmailBadge}>
                  <Check size={11} /> Verified
                </span>
              </SettingRow>
            </Section>

            <Section title="Session">
              <SettingRow icon={LogOut} iconColor="#f59e0b" iconBg="rgba(245,158,11,0.12)"
                label="Sign out"
                desc="Sign out of QuizSync on this device">
                <button className={styles.actionBtn} onClick={signOut}>
                  Sign Out
                </button>
              </SettingRow>
            </Section>

            <Section title="Danger Zone">
              <div className={styles.dangerCard}>
                <div className={styles.dangerHeader}>
                  <Trash2 size={16} color="#ef4444" />
                  <div>
                    <div className={styles.dangerTitle}>Delete Account</div>
                    <div className={styles.dangerDesc}>
                      Permanently delete your account and all associated quizzes, sessions, and data.
                      This action <strong>cannot be undone</strong>.
                    </div>
                  </div>
                </div>
                <div className={styles.dangerConfirmRow}>
                  <input
                    className={styles.dangerInput}
                    placeholder={`Type "DELETE" to confirm`}
                    value={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.value)}
                  />
                  <button
                    className={styles.dangerBtn}
                    disabled={deleteConfirm !== 'DELETE' || deletingAccount}
                    onClick={() => showToast('Account deletion is disabled in demo mode', 'error')}
                  >
                    {deletingAccount ? <Loader2 size={14} className={styles.spinIcon} /> : <Trash2 size={14} />}
                    Delete Account
                  </button>
                </div>
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  )
}