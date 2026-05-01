import { CheckCircle } from "lucide-react";
import instructorImg from "@/assets/instructor.jpg";

const bullets = [
  "8+ years experience",
  "Secured 100+ applications",
  "Certified Ethical Hacker",
  "Enterprise Security Consultant",
  "Security Trainer & Mentor",
];

const AboutSection = () => (
  <section id="about" className="section-padding gradient-bg">
    <div className="container mx-auto">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div className="glass-card p-2 rounded-2xl">
          <img
            src={instructorImg}
            alt="Cybersecurity instructor"
            className="w-full rounded-xl object-cover aspect-[4/5]"
          />
        </div>
        <div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Meet Your <span className="glow-text">Instructor</span>
          </h2>
          <ul className="space-y-4">
            {bullets.map((b) => (
              <li key={b} className="flex items-center gap-3 text-lg text-muted-foreground">
                <CheckCircle className="text-primary shrink-0" size={22} />
                {b}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </section>
);

export default AboutSection;
