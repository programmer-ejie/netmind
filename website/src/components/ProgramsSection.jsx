const programs = [
  {
    title: 'Coach Workspace',
    items: ['Team setup', 'Lineup planning', 'Player comparison'],
  },
  {
    title: 'Trainer Workspace',
    items: ['Drill library', 'Assignments', 'Session logs'],
  },
  {
    title: 'Player Workspace',
    items: ['Training targets', 'Match stats', 'Health status'],
  },
]

const ProgramsSection = () => (
  <section id="courses" className="section-padding gradient-bg">
    <div className="container mx-auto">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
        NetMind <span className="glow-text">Workspaces</span>
      </h2>
      <div className="grid md:grid-cols-3 gap-6">
        {programs.map((program) => (
          <div
            key={program.title}
            className="glass-card-hover p-8 flex flex-col"
          >
            <h3 className="text-xl font-bold mb-4 glow-text">{program.title}</h3>
            <ul className="space-y-2 text-muted-foreground">
              {program.items.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  </section>
)

export default ProgramsSection
