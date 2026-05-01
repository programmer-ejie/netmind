const faqs = [
  { q: 'Is this connected to the database now?', a: 'For now the React app uses static data with the same field names as the MySQL tables.' },
  { q: 'Can this become API-driven later?', a: 'Yes. The static objects mirror the API resources, so each section can be swapped to fetch from Express routes.' },
  { q: 'Which roles does NetMind support?', a: 'Coach, trainer, and player roles are represented in the users table and interface copy.' },
  { q: 'What sport is this built around?', a: 'The current schema and content are built for volleyball teams and performance tracking.' },
  { q: 'Where is the full seed data?', a: 'The backend has database/staticData.js and scripts/seedStaticData.js for repeatable demo records.' },
]

const FAQSection = () => (
  <section id="faq" className="section-padding gradient-bg">
    <div className="container mx-auto max-w-3xl">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
        Frequently Asked <span className="glow-text">Questions</span>
      </h2>
      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <details key={faq.q} className="glass-card border px-6 rounded-xl" open={index === 0}>
            <summary className="text-left font-semibold hover:no-underline py-4 cursor-pointer">
              {faq.q}
            </summary>
            <div className="text-muted-foreground pb-4">
              {faq.a}
            </div>
          </details>
        ))}
      </div>
    </div>
  </section>
)

export default FAQSection
