import { useState } from 'react'
import { X } from 'lucide-react'

const LeadCaptureModal = ({ open, onClose }) => {
  const [email, setEmail] = useState('')
  const [team, setTeam] = useState('')

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-card relative z-10 p-8 rounded-2xl w-full max-w-md border-primary/30">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close demo form"
        >
          <X size={20} />
        </button>
        <h3 className="text-2xl font-bold mb-2">
          Request a NetMind <span className="glow-text">Team Demo</span>
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Leave team details and we will prepare a volleyball performance workspace.
        </p>
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <input
            type="text"
            placeholder="Team name or WhatsApp number"
            value={team}
            onChange={(event) => setTeam(event.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button className="glow-button w-full py-4 text-lg">
            Request Demo
          </button>
        </div>
      </div>
    </div>
  )
}

export default LeadCaptureModal
