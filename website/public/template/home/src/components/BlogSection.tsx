import { ArrowRight } from "lucide-react";

const articles = [
  { title: "Top 10 Ethical Hacking Tools", tag: "Tools", desc: "Explore the most powerful tools every ethical hacker needs in their arsenal." },
  { title: "How SOC Teams Work", tag: "SOC", desc: "Understand the inner workings of a Security Operations Center." },
  { title: "Bug Bounty Beginner Guide", tag: "Bug Bounty", desc: "Your step-by-step guide to starting a bug bounty career." },
];

const BlogSection = () => (
  <section id="blog" className="section-padding">
    <div className="container mx-auto">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
        Latest <span className="glow-text">Articles</span>
      </h2>
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {articles.map((a) => (
          <div key={a.title} className="glass-card-hover p-6 flex flex-col">
            <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full w-fit mb-4">
              {a.tag}
            </span>
            <h3 className="text-lg font-bold mb-2">{a.title}</h3>
            <p className="text-sm text-muted-foreground mb-4 flex-1">{a.desc}</p>
            <a href="#" className="text-primary text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all">
              Read More <ArrowRight size={14} />
            </a>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default BlogSection;
