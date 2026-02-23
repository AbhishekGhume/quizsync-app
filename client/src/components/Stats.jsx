import { Users, ClipboardList, TrendingUp } from 'lucide-react'
import styles from './Stats.module.css'

const stats = [
  {
    icon: Users,
    value: '+10,000+',
    label: 'Faculty Members',
    desc: 'Create structured assessments in seconds. Upload notes or provide topics to generate syllabus-aligned questions instantly.',
  },
  {
    icon: ClipboardList,
    value: '+500,000+',
    label: 'Assessments Conducted',
    desc: 'Monitor student responses live with instant scoring and detailed insights.',
  },
  {
    icon: TrendingUp,
    value: '2M+',
    label: 'Student Submissions',
    desc: 'Monitor student responses live with instant scoring and detailed insights.',
  },
]

export default function Stats() {
  return (
    <section className={styles.section} id="features">
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Comprehensive Tools for Academic Assessment</h2>
          <p className={styles.subtitle}>
            Powerful features designed to streamline quiz creation and evaluation.
          </p>
        </div>

        <div className={styles.grid}>
          {stats.map((s, i) => {
            const Icon = s.icon
            return (
              <div key={i} className={styles.card}>
                <div className={styles.iconWrap}>
                  <Icon size={20} />
                </div>
                <div className={styles.value}>{s.value}</div>
                <div className={styles.label}>{s.label}</div>
                <p className={styles.desc}>{s.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}