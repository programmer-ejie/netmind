import { BarChart3, BookOpen, CheckSquare, Home, Play, Settings, Users } from 'lucide-react'

const sidebarItems = [
  { icon: Home, label: 'Dashboard' },
  { icon: BookOpen, label: 'Roster' },
  { icon: Play, label: 'Training' },
  { icon: BarChart3, label: 'Performance' },
  { icon: Users, label: 'Lineups' },
  { icon: Settings, label: 'Settings' },
]

const activityItems = [
  'Training assignments appear here after creation',
  'Match results sync from your team records',
  'Player performance updates from logged sessions',
]

const previewCards = [
  { label: 'Roster', value: 'Players', detail: 'Positions' },
  { label: 'Training', value: 'Drills', detail: 'Targets' },
  { label: 'Matches', value: 'Results', detail: 'Trends' },
]

const DashboardPreview = () => (
  <section className="section-padding">
    <div className="container mx-auto">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
        Coach <span className="glow-text">Dashboard Preview</span>
      </h2>
      <div className="glass-card overflow-hidden rounded-2xl max-w-5xl mx-auto">
        <div className="flex min-h-[400px]">
          <div className="hidden md:flex flex-col w-56 border-r border-border/50 p-4 gap-1">
            <span className="text-sm font-bold glow-text mb-4 px-3">NetMind Coach</span>
            {sidebarItems.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  label === 'Training'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={16} />
                {label}
              </div>
            ))}
          </div>

          <div className="flex-1 p-6">
            <h3 className="font-semibold mb-4">Team Workspace</h3>
            <div className="glass-card aspect-video rounded-xl flex items-center justify-center mb-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full p-6">
                {previewCards.map((card) => (
                  <div key={card.label} className="glass-card p-6 text-center">
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <h4 className="font-semibold">{card.value}</h4>
                    <p className="glow-text text-sm">{card.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Workspace Readiness</span>
                <span className="font-semibold glow-text">70%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary w-[70%] transition-all" />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-3">Recent Data Activity</h4>
              <div className="space-y-2">
                {activityItems.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckSquare className="text-primary" size={16} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
)

export default DashboardPreview
