import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const modules = [
  { title: "Module 1 – Cyber Security Fundamentals", lessons: 12, duration: "4 hours" },
  { title: "Module 2 – Networking Basics", lessons: 10, duration: "3.5 hours" },
  { title: "Module 3 – Ethical Hacking Tools", lessons: 14, duration: "5 hours" },
  { title: "Module 4 – Real-World Attacks", lessons: 8, duration: "3 hours" },
  { title: "Module 5 – SOC Operations", lessons: 11, duration: "4 hours" },
  { title: "Module 6 – Career & Job Preparation", lessons: 6, duration: "2 hours" },
];

const CurriculumSection = () => (
  <section id="curriculum" className="section-padding">
    <div className="container mx-auto max-w-3xl">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
        Course <span className="glow-text">Curriculum</span>
      </h2>
      <Accordion type="single" collapsible className="space-y-3">
        {modules.map((m, i) => (
          <AccordionItem key={i} value={`m-${i}`} className="glass-card border px-6 rounded-xl">
            <AccordionTrigger className="text-left font-semibold hover:no-underline">
              {m.title}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              {m.lessons} Lessons • {m.duration}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
);

export default CurriculumSection;
