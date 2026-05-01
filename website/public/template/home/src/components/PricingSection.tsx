import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "₹2,999",
    features: ["Recorded Access", "Basic Labs", "Community"],
    popular: false,
  },
  {
    name: "Pro",
    price: "₹6,999",
    features: ["Live Sessions", "Advanced Labs", "Certification", "Priority Support"],
    popular: true,
  },
  {
    name: "Mentor",
    price: "₹19,999",
    features: ["1:1 Mentorship", "Career Guidance", "Resume Review", "Job Support"],
    popular: false,
  },
];

const PricingSection = () => (
  <section id="pricing" className="section-padding gradient-bg">
    <div className="container mx-auto">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
        Choose Your <span className="glow-text">Plan</span>
      </h2>
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`glass-card-hover p-8 flex flex-col relative ${
              p.popular ? "border-primary/50 ring-1 ring-primary/30" : ""
            }`}
          >
            {p.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full">
                Most Popular
              </span>
            )}
            <h3 className="text-xl font-bold mb-2">{p.name}</h3>
            <p className="text-3xl font-extrabold glow-text mb-6">{p.price}</p>
            <ul className="space-y-3 mb-8 flex-1">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-muted-foreground">
                  <Check className="text-primary shrink-0" size={18} />
                  {f}
                </li>
              ))}
            </ul>
            <a
              href="#"
              className={`text-center rounded-lg py-3 font-semibold transition-all duration-300 ${
                p.popular
                  ? "glow-button"
                  : "border border-primary/30 text-foreground hover:bg-primary/10"
              }`}
            >
              Get Started
            </a>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default PricingSection;
