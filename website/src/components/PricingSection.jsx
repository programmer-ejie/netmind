import { Check } from 'lucide-react'

const roles = [
  {
    name: 'Coach',
    price: 'Team',
    features: ['Create teams', 'Plan lineups', 'Compare players'],
    popular: false,
  },
  {
    name: 'Trainer',
    price: 'Training',
    features: ['Assign drills', 'Log reps', 'Monitor attendance'],
    popular: true,
  },
  {
    name: 'Player',
    price: 'Progress',
    features: ['View targets', 'Track stats', 'Report status'],
    popular: false,
  },
]

const PricingSection = () => (
  <section id="pricing" className="section-padding gradient-bg">
    <div className="container mx-auto">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
        Built Around <span className="glow-text">Roles</span>
      </h2>
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {roles.map((role) => (
          <div
            key={role.name}
            className={`glass-card-hover p-8 flex flex-col relative ${
              role.popular ? 'border-primary/50 ring-1 ring-primary/30' : ''
            }`}
          >
            {role.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full">
                Primary
              </span>
            )}
            <h3 className="text-xl font-bold mb-2">{role.name}</h3>
            <p className="text-3xl font-extrabold glow-text mb-6">{role.price}</p>
            <ul className="space-y-3 mb-8 flex-1">
              {role.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-muted-foreground">
                  <Check className="text-primary shrink-0" size={18} />
                  {feature}
                </li>
              ))}
            </ul>
            <a
              href="#courses"
              className={`text-center rounded-lg py-3 font-semibold transition-all duration-300 ${
                role.popular
                  ? 'glow-button'
                  : 'border border-primary/30 text-foreground hover:bg-primary/10'
              }`}
            >
              View Role
            </a>
          </div>
        ))}
      </div>
    </div>
  </section>
)

export default PricingSection
