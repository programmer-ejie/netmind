const modules = [
  { title: 'Step 1 - Register coaches, trainers, and players', detail: 'Create accounts in the users table through the API.' },
  { title: 'Step 2 - Create teams, seasons, and roster links', detail: 'Build the team workspace and connect members to teams.' },
  { title: 'Step 3 - Log matches, attendance, and training', detail: 'Capture real activity as your team works.' },
  { title: 'Step 4 - Track drills, injuries, and performance', detail: 'Record volleyball development data from live sessions.' },
  { title: 'Step 5 - Generate rankings and comparisons', detail: 'Use saved records to compare players and team trends.' },
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
              {module.detail}
            </div>
          </details>
        ))}
      </div>
    </div>
  </section>
)

export default CurriculumSection
