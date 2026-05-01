const programs = [
  {
    title: "Beginner Bootcamp",
    items: ["Foundations", "Hands-on Labs", "Certification"],
  },
  {
    title: "Ethical Hacking Masterclass",
    items: ["Kali Linux", "Metasploit", "Burp Suite"],
  },
  {
    title: "Bug Bounty Blueprint",
    items: ["Real vulnerability hunting", "Report writing", "Freelance roadmap"],
  },
];

const ProgramsSection = () => (
  <section id="courses" className="section-padding gradient-bg">
    <div className="container mx-auto">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
        Programs <span className="glow-text">Offered</span>
      </h2>
      <div className="grid md:grid-cols-3 gap-6">
        {programs.map((p) => (
          <div
            key={p.title}
            className="glass-card-hover p-8 flex flex-col"
          >
            <h3 className="text-xl font-bold mb-4 glow-text">{p.title}</h3>
            <ul className="space-y-2 text-muted-foreground">
              {p.items.map((item) => (
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
);

export default ProgramsSection;
