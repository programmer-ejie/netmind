import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  { q: "Do I need coding knowledge?", a: "No! Our course starts from absolute basics and gradually builds up. No prior coding experience required." },
  { q: "Is certification included?", a: "Yes, upon completing the Pro or Mentor plan, you receive a verifiable certificate of completion." },
  { q: "How long to get a job?", a: "Most of our dedicated students land roles within 3-6 months of completing the program." },
  { q: "Is this beginner friendly?", a: "Absolutely! The Beginner Bootcamp is specifically designed for those with zero experience." },
  { q: "Do you provide job support?", a: "Our Mentor plan includes full career guidance, resume review, and job placement support." },
];

const FAQSection = () => (
  <section id="faq" className="section-padding gradient-bg">
    <div className="container mx-auto max-w-3xl">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
        Frequently Asked <span className="glow-text">Questions</span>
      </h2>
      <Accordion type="single" collapsible className="space-y-3">
        {faqs.map((f, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="glass-card border px-6 rounded-xl">
            <AccordionTrigger className="text-left font-semibold hover:no-underline">
              {f.q}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              {f.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
);

export default FAQSection;
