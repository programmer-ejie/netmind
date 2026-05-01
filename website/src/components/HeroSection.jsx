import heroBg from '../assets/hero-bg.jpg'
import { siteContent } from '../data/netmindData'

const HeroSection = ({ onOpenModal }) => (
  <section className="relative min-h-screen flex items-center justify-center overflow-hidden section-padding pt-32">
    <div className="absolute inset-0">
      <img src={heroBg} alt="" className="w-full h-full object-cover opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
    </div>
    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px] animate-pulse-glow" />

    <div className="relative z-10 text-center max-w-3xl mx-auto">
      <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
        {siteContent.name} <span className="glow-text">Volleyball Intelligence</span>
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
        {siteContent.tagline} Track players, drills, lineups, attendance, injuries, and match performance from one data-ready system.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
        <a href="#courses" className="glow-button text-lg px-8 py-4">
          View Static Data
        </a>
        <button
          onClick={onOpenModal}
          className="px-8 py-4 rounded-lg border border-primary/30 text-foreground font-semibold hover:bg-primary/10 transition-all duration-300"
        >
          Request Team Demo
        </button>
      </div>
      <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
        {siteContent.stats.map((stat) => (
          <span key={stat}>{stat}</span>
        ))}
      </div>
    </div>
  </section>
)

export default HeroSection
