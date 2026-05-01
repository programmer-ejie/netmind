import { ArrowRight } from 'lucide-react'

const articles = [
  { title: 'How NetMind Models Player Progress', tag: 'Data', desc: 'Users, drills, assignments, logs, and rankings connect around each athlete.' },
  { title: 'Building Better Lineups From Match Logs', tag: 'Lineups', desc: 'Coaches can review performance before choosing rotations.' },
  { title: 'Keeping Attendance and Injury Context Together', tag: 'Health', desc: 'Training decisions improve when availability data is visible.' },
]

const BlogSection = () => (
  <section id="blog" className="section-padding">
    <div className="container mx-auto">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
        NetMind <span className="glow-text">Updates</span>
      </h2>
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {articles.map((article) => (
          <div key={article.title} className="glass-card-hover p-6 flex flex-col">
            <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full w-fit mb-4">
              {article.tag}
            </span>
            <h3 className="text-lg font-bold mb-2">{article.title}</h3>
            <p className="text-sm text-muted-foreground mb-4 flex-1">{article.desc}</p>
            <a href="#courses" className="text-primary text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all">
              Read More <ArrowRight size={14} />
            </a>
          </div>
        ))}
      </div>
    </div>
  </section>
)

export default BlogSection
