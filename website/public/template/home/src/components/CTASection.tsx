const CTASection = () => (
  <section className="section-padding">
    <div className="container mx-auto text-center max-w-2xl relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/10 blur-[100px] animate-pulse-glow" />
      <div className="relative z-10">
        <h2 className="text-3xl md:text-5xl font-extrabold mb-8">
          Ready to Start Your{" "}
          <span className="glow-text">Cyber Security Career?</span>
        </h2>
        <a href="#pricing" className="glow-button text-lg px-10 py-5 inline-block">
          Enroll Now
        </a>
      </div>
    </div>
  </section>
);

export default CTASection;
