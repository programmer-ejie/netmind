import { CheckCircle } from 'lucide-react'
import instructorImg from '../assets/logo_volley.jpg'
import { siteContent } from '../data/netmindData'

const bullets = [
  'Coach, trainer, and player roles',
  'Roster, season, and match records',
  'Drill assignments and performance logs',
  'Attendance and injury monitoring',
  'Lineup and player comparison data',
]

const AboutSection = () => (
  <section id="about" className="section-padding gradient-bg">
    <div className="container mx-auto">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div className="glass-card p-2 rounded-2xl">
          <img
            src={instructorImg}
            alt="Volleyball team performance review"
            className="w-full rounded-xl object-cover aspect-[4/5]"
          />
        </div>
        <div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            About <span className="glow-text">{siteContent.name}</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-6">{siteContent.about}</p>
          <ul className="space-y-4">
            {bullets.map((bullet) => (
              <li key={bullet} className="flex items-center gap-3 text-lg text-muted-foreground">
                <CheckCircle className="text-primary shrink-0" size={22} />
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </section>
)

export default AboutSection
