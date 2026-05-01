import { Star, User } from 'lucide-react'

const testimonials = [
  { text: 'The roster, drill, and match data finally live in one place.', name: 'Maya S.' },
  { text: 'Assignments are easier to track because every drill has a target.', name: 'Leo R.' },
  { text: 'I can see what to improve before the next match.', name: 'Ari L.' },
]

const TestimonialsSection = () => (
  <section className="section-padding gradient-bg">
    <div className="container mx-auto">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
        What Teams <span className="glow-text">Track</span>
      </h2>
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {testimonials.map((testimonial) => (
          <div key={testimonial.name} className="glass-card-hover p-6">
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, index) => (
                <Star key={index} className="text-primary fill-primary" size={16} />
              ))}
            </div>
            <p className="text-muted-foreground mb-6 italic">"{testimonial.text}"</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <User className="text-muted-foreground" size={18} />
              </div>
              <span className="font-semibold text-sm">{testimonial.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
)

export default TestimonialsSection
