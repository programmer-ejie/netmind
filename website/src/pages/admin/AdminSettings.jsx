import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, DatabaseBackup, Download, Eye, EyeOff, HardDrive, Info, MailCheck, ShieldCheck, TriangleAlert } from 'lucide-react'
import AdminLayout, {
  AdminButton,
  AdminCard,
  AdminField,
  AdminInput,
} from './AdminLayout'
import { API_BASE, apiRequest, listResource, readSavedUser } from '../../lib/api'

const AdminSettings = ({ currentPath = '#coach/settings' }) => {
  const savedUser = useMemo(() => readSavedUser(), [])
  const [coaches, setCoaches] = useState([])
  const [profile, setProfile] = useState(savedUser || null)
  const [codeOpen, setCodeOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [passwordCode, setPasswordCode] = useState('')
  const codeInputRefs = useRef([])
  const [passwordForm, setPasswordForm] = useState({ next: '', confirm: '' })
  const [passwordVisible, setPasswordVisible] = useState({ next: false, confirm: false })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const coachRows = await listResource('coaches')
      setCoaches(coachRows)
      setProfile((current) => current || coachRows[0] || null)
    }

    load().catch((err) => setError(err.message))
  }, [])

  const openPasswordCodeModal = async () => {
    setMessage('')
    setError('')

    if (!profile?.id) {
      setError('Choose a profile before changing the password.')
      return
    }

    try {
      setPasswordLoading(true)
      await apiRequest(`/users/${profile.id}/password-code`, { method: 'POST' })
      setPasswordCode('')
      setCodeOpen(true)
      setMessage(`Confirmation code sent to ${profile.email}.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setPasswordLoading(false)
    }
  }

  const verifyPasswordCode = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')

    try {
      setPasswordLoading(true)
      await apiRequest(`/users/${profile.id}/password-code/verify`, {
        method: 'POST',
        body: { code: passwordCode },
      })
      setCodeOpen(false)
      setPasswordOpen(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setPasswordLoading(false)
    }
  }

  const setCodeDigit = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const nextCode = passwordCode.padEnd(6, ' ').split('')
    nextCode[index] = digit || ' '
    const compactCode = nextCode.join('').replace(/\s/g, '')

    setPasswordCode(compactCode)

    if (digit && index < 5) {
      codeInputRefs.current[index + 1]?.focus()
    }
  }

  const handleCodeKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !event.currentTarget.value && index > 0) {
      codeInputRefs.current[index - 1]?.focus()
    }
  }

  const pasteCode = (event) => {
    event.preventDefault()
    const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    setPasswordCode(digits)
    codeInputRefs.current[Math.min(digits.length, 5)]?.focus()
  }

  const changePassword = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')

    if (passwordForm.next.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }

    if (passwordForm.next !== passwordForm.confirm) {
      setError('New password and confirm password do not match.')
      return
    }

    try {
      setPasswordLoading(true)
      await apiRequest(`/users/${profile.id}/password-with-code`, {
        method: 'PATCH',
        body: {
          code: passwordCode,
          new_password: passwordForm.next,
        },
      })
      setMessage('Password changed.')
      setPasswordForm({ next: '', confirm: '' })
      setPasswordCode('')
      setPasswordOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setPasswordLoading(false)
    }
  }

  const exportDatabase = async () => {
    try {
      setExporting(true)
      setMessage('')
      setError('')

      const response = await fetch(`${API_BASE}/database/export`)
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message || `Export failed with ${response.status}`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `netmind-${new Date().toISOString().slice(0, 10)}.sql`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setMessage('Database export downloaded.')
    } catch (err) {
      setError(err.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <AdminLayout title="Settings" currentPath={currentPath}>
      {error && <div className="admin-alert">{error}</div>}
      {message && <div className="admin-alert success">{message}</div>}

      <div className="admin-two-column">
        <AdminCard>
          <div className="admin-card-header">
            <div>
              <h2>Data & Maintenance</h2>
              <p className="admin-muted">Export records and check key system services.</p>
            </div>
            <DatabaseBackup size={22} />
          </div>

          <div className="admin-settings-tools">
            <button type="button" className="admin-settings-tool primary" onClick={exportDatabase} disabled={exporting}>
              <span><Download size={20} /></span>
              <strong>{exporting ? 'Exporting...' : 'Export Database'}</strong>
              <small>Download schema and records as a SQL backup file.</small>
            </button>
            <div className="admin-settings-tool disabled" aria-disabled="true">
              <span><Activity size={20} /></span>
              <strong>API Health</strong>
              <small>Backend API: {API_BASE.replace('/api', '')}</small>
            </div>
            <div className="admin-settings-tool disabled" aria-disabled="true">
              <span><HardDrive size={20} /></span>
              <strong>Drive Storage</strong>
              <small>Profile pictures are synced to Google Drive.</small>
            </div>
          </div>
        </AdminCard>

        <AdminCard>
          <div className="admin-card-header">
            <div>
              <h2>Change Password</h2>
              <p className="admin-muted">Send a confirmation code to your Gmail before changing credentials.</p>
            </div>
            <ShieldCheck size={22} />
          </div>

          <div className="admin-password-card-body">
            <MailCheck size={34} />
            <p className="admin-muted">
              A 6-digit code will be sent to {profile?.email || 'your Gmail'} before the new password form opens.
            </p>
            <AdminButton type="button" onClick={openPasswordCodeModal} disabled={passwordLoading || !profile}>
              {passwordLoading ? 'Sending...' : 'Change Password'}
            </AdminButton>
          </div>
        </AdminCard>
      </div>

      <AdminCard className="admin-settings-note-card">
        <Info size={20} />
        <div>
          <strong>Settings Notice</strong>
          <p>
            This area controls system-level actions for NetMind. Export backups before major changes,
            keep password updates private, and restart the backend after changing server environment values.
          </p>
        </div>
      </AdminCard>

      {codeOpen && (
        <div className="admin-modal-backdrop admin-centered-modal-backdrop" role="presentation" onMouseDown={() => setCodeOpen(false)}>
          <section className="admin-modal admin-password-modal admin-code-modal" role="dialog" aria-modal="true" aria-label="Password confirmation code" onMouseDown={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h2>Enter Confirmation Code</h2>
                <p className="admin-muted">Check {profile?.email} for the code.</p>
              </div>
              <button type="button" className="admin-modal-close" onClick={() => setCodeOpen(false)} aria-label="Close confirmation code">x</button>
            </div>
            <form className="admin-form" onSubmit={verifyPasswordCode}>
              <div className="admin-code-tip">
                <Info size={18} />
                <p>Enter the 6-digit number from Gmail. The code expires in 10 minutes.</p>
              </div>
              <div className="admin-code-entry" aria-label="Confirmation code" onPaste={pasteCode}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <Fragment key={`code-${index}`}>
                    {index === 3 && <span className="admin-code-separator" aria-hidden="true">-</span>}
                    <input
                      ref={(element) => {
                        codeInputRefs.current[index] = element
                      }}
                      aria-label={`Code digit ${index + 1}`}
                      inputMode="numeric"
                      maxLength="1"
                      value={passwordCode[index] || ''}
                      onChange={(event) => setCodeDigit(index, event.target.value)}
                      onKeyDown={(event) => handleCodeKeyDown(index, event)}
                    />
                  </Fragment>
                ))}
              </div>
              <div className="admin-profile-offcanvas-actions">
                <AdminButton type="button" variant="ghost" onClick={() => setCodeOpen(false)}>Cancel</AdminButton>
                <AdminButton type="submit" disabled={passwordLoading}>{passwordLoading ? 'Verifying...' : 'Verify Code'}</AdminButton>
              </div>
            </form>
          </section>
        </div>
      )}

      {passwordOpen && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={() => setPasswordOpen(false)}>
          <section className="admin-modal admin-password-modal" role="dialog" aria-modal="true" aria-label="New password" onMouseDown={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h2>Set New Password</h2>
                <p className="admin-muted">Create a new password for your account.</p>
              </div>
              <button type="button" className="admin-modal-close" onClick={() => setPasswordOpen(false)} aria-label="Close new password">x</button>
            </div>
            <form className="admin-form" onSubmit={changePassword}>
              <div className="admin-password-tip">
                <Info size={18} />
                <p>Use a password that is hard to guess and different from your Gmail password.</p>
              </div>
              <AdminField label="New Password">
                <div className="admin-password-input-wrap">
                  <AdminInput
                    required
                    type={passwordVisible.next ? 'text' : 'password'}
                    minLength="6"
                    value={passwordForm.next}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, next: event.target.value }))}
                  />
                  <button
                    type="button"
                    className="admin-password-eye"
                    onClick={() => setPasswordVisible((current) => ({ ...current, next: !current.next }))}
                    aria-label={passwordVisible.next ? 'Hide new password' : 'Show new password'}
                  >
                    {passwordVisible.next ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </AdminField>
              <AdminField label="Confirm Password">
                <div className="admin-password-input-wrap">
                  <AdminInput
                    required
                    type={passwordVisible.confirm ? 'text' : 'password'}
                    minLength="6"
                    value={passwordForm.confirm}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, confirm: event.target.value }))}
                  />
                  <button
                    type="button"
                    className="admin-password-eye"
                    onClick={() => setPasswordVisible((current) => ({ ...current, confirm: !current.confirm }))}
                    aria-label={passwordVisible.confirm ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {passwordVisible.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </AdminField>
              <div className="admin-password-warning">
                <TriangleAlert size={17} />
                <p>Be careful when editing your password. After saving, use the new password the next time you log in.</p>
              </div>
              <div className="admin-profile-offcanvas-actions">
                <AdminButton type="button" variant="ghost" onClick={() => setPasswordOpen(false)}>Cancel</AdminButton>
                <AdminButton type="submit" disabled={passwordLoading}>{passwordLoading ? 'Saving...' : 'Change Password'}</AdminButton>
              </div>
            </form>
          </section>
        </div>
      )}

      {coaches.length > 1 && (
        <p className="admin-muted admin-settings-note">
          Showing the saved coach profile first, otherwise the first coach account from the API.
        </p>
      )}
    </AdminLayout>
  )
}

export default AdminSettings
