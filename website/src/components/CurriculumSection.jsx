const modules = [
  { title: 'Step 1 - Register coaches, trainers, and players', records: 5, table: 'users' },
  { title: 'Step 2 - Create teams, seasons, and roster links', records: 5, table: 'teams and team_members' },
  { title: 'Step 3 - Log matches, attendance, and training', records: 6, table: 'matches and attendance_logs' },
  { title: 'Step 4 - Track drills, injuries, and performance', records: 5, table: 'drills and performance_logs' },
  { title: 'Step 5 - Generate rankings and comparisons', records: 2, table: 'team_rankings and player_comparisons' },
]

const CurriculumSection = () => (
  <section id="curriculum" className="section-padding">
    <div className="container mx-auto max-w-3xl">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
        Data <span className="glow-text">Workflow</span>
      </h2>
      <div className="space-y-3">
        {modules.map((module, index) => (
          <details key={module.title} className="glass-card border px-6 rounded-xl" open={index === 0}>
            <summary className="text-left font-semibold hover:no-underline py-4 cursor-pointer">
              {module.title}
            </summary>
            <div className="text-muted-foreground pb-4">
              {module.records} static records mapped to {module.table}
            </div>
          </details>
        ))}
      </div>
    </div>
  </section>
)

export default CurriculumSection
