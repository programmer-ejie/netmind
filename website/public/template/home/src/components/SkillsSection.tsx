import { Shield, Bug, Globe, Skull, Activity, Target } from "lucide-react";

const skills = [
  { icon: Shield, title: "Network Security" },
  { icon: Bug, title: "Ethical Hacking" },
  { icon: Globe, title: "Web Application Security" },
  { icon: Skull, title: "Malware & Ransomware Analysis" },
  { icon: Activity, title: "SOC & Incident Response" },
  { icon: Target, title: "Bug Bounty Hunting" },
];

const SkillsSection = () => (
  <section className="section-padding">
    <div className="container mx-auto">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
        Core Skills <span className="glow-text">Covered</span>
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
);

export default SkillsSection;
