import { useState } from 'react'
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, UserRound } from 'lucide-react'
import { siteContent } from '../data/netmindData'
import { loginUser, registerCoachWithTemporaryPassword, saveUser } from '../lib/api'

const Field = ({ icon: Icon, label, children }) => (
  <label className="auth-field">
    <span>{label}</span>
    <div className="auth-input-wrap">
      <Icon className="auth-input-icon" size={18} />
      {children}
    </div>
  </label>
)

const AuthStatusModal = ({ status, message, onClose }) => {
  if (!status) return null

  const isLoading = status === 'loading'
  const isSuccess = status === 'success'
  const Icon = isLoading ? Loader2 : isSuccess ? CheckCircle2 : AlertCircle
  const iconClass = isLoading ? 'is-loading' : isSuccess ? 'is-success' : 'is-error'

  return (
    <div className="auth-status-backdrop" role="presentation">
      <div className="auth-status-modal" role="dialog" aria-modal="true" aria-live="polite">
        <div className={`auth-status-icon ${iconClass}`}>
          <Icon size={34} />
        </div>
        <h4>
          {statusModalTitle(status, message)}
        </h4>
        <p>{message}</p>
        {!isLoading && (
          <button type="button" className="glow-button auth-status-button" onClick={onClose}>
            OK
          </button>
        )}
      </div>
    </div>
  )
}

const statusModalTitle = (status, message = '') => {
  if (status === 'success') return 'Account created'
  if (status === 'error') return 'Request failed'
  if (message.toLowerCase().includes('checking')) return 'Logging in'
  return 'Sending Gmail message'
}

const AuthSection = () => {
  const [mode, setMode] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [statusModal, setStatusModal] = useState(null)
  const isSignup = mode === 'signup'
  const isSubmitting = statusModal?.status === 'loading'

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const closeStatusModal = () => {
    const status = statusModal?.status
    setStatusModal(null)

    if (status === 'success') {
      setMode('login')
      setForm((current) => ({ ...current, password: '' }))
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (isSignup) {
      setStatusModal({
        status: 'loading',
        message: `Creating the coach account and sending the temporary password to ${form.email}.`,
      })

      try {
        await registerCoachWithTemporaryPassword({
          name: form.name,
          email: form.email,
        })
        setStatusModal({
          status: 'success',
          message: 'The coach account was created and the temporary password was sent to Gmail.',
        })
        setForm({ name: '', email: '', password: '' })
      } catch (error) {
        const message = error.message === 'Email is already registered'
          ? 'This email is already registered. Please log in instead.'
          : error.message || 'Unable to create the account or send the Gmail message.'

        setStatusModal({ status: 'error', message })
      }

      return
    }

    setStatusModal({
      status: 'loading',
      message: 'Checking the registered email and password.',
    })

    try {
      const payload = await loginUser({
        email: form.email,
        password: form.password,
      })

      saveUser(payload.user)
      localStorage.setItem('netmind_token', payload.token)
      setStatusModal(null)
      window.location.hash = 'coach'
    } catch (error) {
      setStatusModal({
        status: 'error',
        message: error.message === 'Invalid email or password'
          ? 'No registered email found or the password is incorrect.'
          : error.message || 'Unable to log in.',
      })
    }
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
                  value={form.name}
                  onChange={(event) => updateForm('name', event.target.value)}
                  disabled={isSubmitting}
                />
              </Field>
            )}

            <Field icon={Mail} label="Email">
              <input
                type="email"
                required
                placeholder="name@netmind.test"
                className="auth-input"
                value={form.email}
                onChange={(event) => updateForm('email', event.target.value)}
                disabled={isSubmitting}
              />
            </Field>

            {!isSignup && (
              <Field icon={Lock} label="Password">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter password"
                  className="auth-input auth-input-password"
                  value={form.password}
                  onChange={(event) => updateForm('password', event.target.value)}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="auth-password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  disabled={isSubmitting}
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

            <button type="submit" className="glow-button w-full py-4 text-lg" disabled={isSubmitting}>
              {isSubmitting ? 'Please wait...' : isSignup ? 'Create Coach Account' : 'Login'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => setMode(isSignup ? 'login' : 'signup')}
              className="font-bold text-primary hover:underline"
              disabled={isSubmitting}
            >
              {isSignup ? 'Login' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
      <AuthStatusModal
        status={statusModal?.status}
        message={statusModal?.message}
        onClose={closeStatusModal}
      />
    </section>
  )
}

export default AuthSection
