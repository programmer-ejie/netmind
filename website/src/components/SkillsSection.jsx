import { Activity, BarChart3, ClipboardCheck, Dumbbell, HeartPulse, Users } from 'lucide-react'

const skills = [
  { icon: Users, title: 'Roster Management' },
  { icon: Dumbbell, title: 'Training Assignments' },
  { icon: Activity, title: 'Performance Logs' },
  { icon: ClipboardCheck, title: 'Attendance Tracking' },
  { icon: HeartPulse, title: 'Injury Monitoring' },
  { icon: BarChart3, title: 'Rankings & Comparisons' },
]

const SkillsSection = () => (
  <section className="section-padding">
    <div className="container mx-auto">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
        Core Data <span className="glow-text">Covered</span>
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {skills.map(({ icon: Icon, title }) => (
          <div key={title} className="glass-card-hover p-6 text-center">
            <Icon className="mx-auto mb-4 text-primary" size={40} />
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
        ))}
      </div>
    </div>
  </section>
)

export default SkillsSection
