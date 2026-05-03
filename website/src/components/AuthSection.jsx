import { useState } from 'react'
import { Eye, EyeOff, Lock, Mail, UserRound } from 'lucide-react'
import { siteContent } from '../data/netmindData'

const Field = ({ icon: Icon, label, children }) => (
  <label className="auth-field">
    <span>{label}</span>
    <div className="auth-input-wrap">
      <Icon className="auth-input-icon" size={18} />
      {children}
    </div>
  </label>
)

const AuthSection = () => {
  const [mode, setMode] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const isSignup = mode === 'signup'

  const handleSubmit = (event) => {
    event.preventDefault()
    window.location.hash = 'admin'
  }

  return (
    <section id="auth" className="section-padding gradient-bg">
      <div className="container mx-auto max-w-5xl grid md:grid-cols-2 gap-12 items-center">
        <div className="max-w-md">
          <p className="mb-3 text-sm font-bold uppercase tracking-wide text-primary">
            Team access
          </p>
          <h2 className="text-3xl md:text-5xl font-extrabold mb-6">
            Login or create a coach <span className="glow-text">{siteContent.name}</span> account.
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Coaches create the team workspace first. Trainer and player accounts are added later
            inside the coach dashboard.
          </p>
        </div>

        <div className="glass-card w-full max-w-md mx-auto p-8">
          <div className="mb-8 flex rounded-xl border border-border bg-secondary p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 rounded-lg px-4 py-3 font-bold transition-all ${
                !isSignup ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 rounded-lg px-4 py-3 font-bold transition-all ${
                isSignup ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="mb-8 text-center">
            <h3 className="mb-3 text-2xl font-extrabold">
              {isSignup ? 'Create coach account' : 'Welcome back'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isSignup
                ? 'Set up the coach account that will manage roles.'
                : 'Login to open your NetMind dashboard.'}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {isSignup && (
              <Field icon={UserRound} label="Coach Full Name">
                <input
                  type="text"
                  required
                  placeholder="Maya Santos"
                  className="auth-input"
                />
              </Field>
            )}

            <Field icon={Mail} label="Email">
              <input
                type="email"
                required
                placeholder="name@netmind.test"
                className="auth-input"
              />
            </Field>

            {!isSignup && (
              <Field icon={Lock} label="Password">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter password"
                  className="auth-input auth-input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="auth-password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </Field>
            )}

            {!isSignup && (
              <div className="auth-options">
                <label>
                  <input type="checkbox" />
                  Remember Me
                </label>
                <button type="button">
                  Forgot Password?
                </button>
              </div>
            )}

            <button type="submit" className="glow-button w-full py-4 text-lg">
              {isSignup ? 'Create Coach Account' : 'Login'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => setMode(isSignup ? 'login' : 'signup')}
              className="font-bold text-primary hover:underline"
            >
              {isSignup ? 'Login' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </section>
  )
}

export default AuthSection
