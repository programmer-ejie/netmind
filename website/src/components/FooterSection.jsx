import { useState } from 'react'
import websiteLogo from '../assets/website_logo.png'

const FooterSection = () => {
  const [email, setEmail] = useState('')

  return (
    <footer className="border-t border-border/50 py-12 px-4">
      <div className="container mx-auto grid md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2">
            <img
              src={websiteLogo}
              alt="NetMind"
              className="netmind-logo-mark"
            />
            <span className="netmind-wordmark footer-wordmark">NetMind</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Volleyball intelligence for team performance workflows.
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Quick Links</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#about" className="hover:text-primary transition-colors">About</a></li>
            <li><a href="#courses" className="hover:text-primary transition-colors">Data</a></li>
            <li><a href="#pricing" className="hover:text-primary transition-colors">Roles</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Resources</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#blog" className="hover:text-primary transition-colors">Updates</a></li>
            <li><a href="#faq" className="hover:text-primary transition-colors">FAQ</a></li>
            <li><a href="#curriculum" className="hover:text-primary transition-colors">Workflow</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Team Demo</h4>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button className="glow-button px-4 py-2 text-sm">
              Join
            </button>
          </div>
        </div>
      </div>
      <div className="container mx-auto mt-8 pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
        2026 NetMind. Smart volleyball intelligence for connected teams.
      </div>
    </footer>
  )
}

export default FooterSection
