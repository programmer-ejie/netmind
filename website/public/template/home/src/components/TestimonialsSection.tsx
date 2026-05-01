import { Star, User } from "lucide-react";

const testimonials = [
  { text: "Helped me land my first SOC job!", name: "Rahul K." },
  { text: "Best ethical hacking course for beginners.", name: "Priya S." },
  { text: "Practical and industry focused.", name: "Amit D." },
];

const TestimonialsSection = () => (
  <section className="section-padding gradient-bg">
    <div className="container mx-auto">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
        What Students <span className="glow-text">Say</span>
      </h2>
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {testimonials.map((t) => (
          <div key={t.name} className="glass-card-hover p-6">
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="text-primary fill-primary" size={16} />
              ))}
            </div>
            <p className="text-muted-foreground mb-6 italic">"{t.text}"</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <User className="text-muted-foreground" size={18} />
              </div>
              <span className="font-semibold text-sm">{t.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
