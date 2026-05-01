import { useState } from 'react'
import {
  BarChart3,
  Bell,
  Dumbbell,
  Home,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Shield,
  UserRound,
  Users,
} from 'lucide-react'

export const positions = ['OH', 'OPP', 'MB', 'S', 'L']
export const drillCategories = [
  'spiking',
  'serving',
  'receiving',
  'setting',
  'blocking',
  'defense',
  'conditioning',
  'jumping',
]
export const drillDifficulties = ['beginner', 'intermediate', 'advanced', 'elite']
export const assignmentStatuses = ['pending', 'in_progress', 'completed', 'overdue', 'cancelled']

export const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

export const initials = (name = 'NetMind') => (
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'NM'
)

export const moneylessNumber = (value) => Number(value || 0).toLocaleString()

export const getName = (items, id, fallback = '-') => (
  items.find((item) => String(item.id) === String(id))?.name
  || items.find((item) => String(item.id) === String(id))?.team_name
  || fallback
)

export const parseRankings = (value) => {
  if (Array.isArray(value)) return value
  if (!value) return []
  if (typeof value === 'object') return Array.isArray(value.rankings) ? value.rankings : []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const sidebarGroups = [
  {
    label: 'Dashboards',
    items: [{ href: '#admin', icon: Home, label: 'Dashboard' }],
  },
  {
    label: 'Management',
    items: [
      { href: '#admin/teams', icon: Shield, label: 'Teams' },
      { href: '#admin/players', icon: Users, label: 'Players' },
      { href: '#admin/trainers', icon: UserRound, label: 'Trainers' },
    ],
  },
  {
    label: 'Performance',
    items: [
      { href: '#admin/training', icon: Dumbbell, label: 'Training' },
      { href: '#admin/analytics', icon: BarChart3, label: 'Analytics' },
    ],
  },
  {
    label: 'Utilities',
    items: [{ href: '#admin/settings', icon: Settings, label: 'Settings' }],
  },
]

export const AdminCard = ({ children, className = '' }) => (
  <div className={`admin-card ${className}`}>{children}</div>
)

export const AdminField = ({ label, children, className = '' }) => (
  <label className={`admin-field ${className}`}>
    <span>{label}</span>
    {children}
  </label>
)

export const AdminInput = (props) => <input className="admin-input" {...props} />
export const AdminSelect = (props) => <select className="admin-input" {...props} />
export const AdminTextarea = (props) => <textarea className="admin-input admin-textarea" {...props} />

export const AdminButton = ({ children, variant = 'primary', className = '', ...props }) => (
  <button className={`admin-button ${variant} ${className}`} {...props}>
    {children}
  </button>
)

export const StatusBadge = ({ children, tone = 'success' }) => (
  <span className={`admin-badge ${tone}`}>{children}</span>
)

export const EmptyState = ({ children = 'No records yet.' }) => (
  <div className="admin-empty">{children}</div>
)

export const AdminModal = ({ open, title, children, onClose }) => {
  if (!open) return null

  return (
    <div className="admin-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-header">
          <h2>{title}</h2>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close modal">
            x
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}

export const StatCard = ({ icon: Icon, label, value, tone = 'primary' }) => (
  <AdminCard className="admin-stat-card">
    <div className={`admin-metric-icon ${tone}`}>
      <Icon size={22} />
    </div>
    <span>{label}</span>
    <strong>{value}</strong>
  </AdminCard>
)

export const BarSet = ({ data, valueKey = 'value', labelKey = 'label' }) => {
  const values = data.map((item) => Number(item[valueKey]) || 0)
  const max = Math.max(...values, 1)

  return (
    <div className="admin-simple-bars">
      {data.map((item, index) => {
        const height = Math.max(12, ((Number(item[valueKey]) || 0) / max) * 100)

        return (
          <div className="admin-simple-bar" key={`${item[labelKey]}-${index}`}>
            <span style={{ height: `${height}%` }} />
            <small>{item[labelKey]}</small>
          </div>
        )
      })}
    </div>
  )
}

export const AdminLayout = ({ children, title, kicker = 'Volleyball Analytics', currentPath }) => {
  const hash = currentPath || window.location.hash || '#admin'
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('netmind_admin_theme') === 'dark'
    } catch {
      return false
    }
  })

  const closeSidebar = () => setSidebarOpen(false)
  const toggleDarkMode = () => {
    setDarkMode((current) => {
      const next = !current
      try {
        localStorage.setItem('netmind_admin_theme', next ? 'dark' : 'light')
      } catch {
        // Ignore unavailable storage.
      }
      return next
    })
  }

  return (
    <main className={`admin-page ${sidebarOpen ? 'sidebar-open' : ''} ${darkMode ? 'admin-dark' : ''}`}>
      <button
        type="button"
        className="admin-sidebar-backdrop"
        aria-label="Close sidebar"
        onClick={closeSidebar}
      />

      <aside className="admin-sidebar" aria-label="Admin sidebar">
        <div className="admin-brand-wrap">
          <a href="#admin" className="admin-logo" onClick={closeSidebar}>
            <b aria-hidden="true">NM</b>
            <span>NetMind</span>
          </a>
        </div>

        <nav className="admin-nav" aria-label="Admin navigation">
          {sidebarGroups.map((group) => (
            <div className="admin-nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map(({ href, icon: Icon, label }) => {
                const isActive = href === '#admin'
                  ? hash === '#admin'
                  : hash === href || hash.startsWith(`${href}/`)

                return (
                  <a
                    key={href}
                    href={href}
                    className={isActive ? 'active' : ''}
                    onClick={closeSidebar}
                  >
                    <Icon size={18} strokeWidth={1.8} />
                    <span>{label}</span>
                  </a>
                )
              })}
            </div>
          ))}
        </nav>

        <a href="#auth" className="admin-logout">
          <LogOut size={18} />
          Logout
        </a>
      </aside>

      <section className="admin-main">
        <header className="admin-header">
          <nav>
            <button
              className="admin-icon-button admin-mobile-toggle"
              aria-label="Open menu"
              onClick={() => setSidebarOpen(true)}
              type="button"
            >
              <Menu size={21} />
            </button>

            <a href="#admin" className="admin-mobile-logo" aria-label="NetMind admin home">
              <b aria-hidden="true">NM</b>
              <span>NetMind</span>
            </a>

            <div className="admin-header-inner">
              <div className="admin-search-wrap">
                <Search size={18} />
                <input className="admin-search" type="search" placeholder="Search..." aria-label="Search admin" />
            </div>
            <div className="admin-title">
              <p className="admin-kicker">{kicker}</p>
              <h1>{title}</h1>
            </div>
            <div className="admin-header-actions">
              <button
                className="admin-icon-button"
                aria-label="Toggle dark mode"
                aria-pressed={darkMode}
                onClick={toggleDarkMode}
                type="button"
              >
                <Moon size={20} />
              </button>
              <button className="admin-icon-button" aria-label="Notifications">
                <Bell size={21} />
                <span className="admin-notification-dot" />
              </button>
              <span className="admin-profile-trigger">
                <span className="admin-profile" aria-label="Admin profile">NM</span>
              </span>
            </div>
          </div>
          </nav>
        </header>

        <div className="admin-content">
          {children}
        </div>
      </section>
    </main>
  )
}

export default AdminLayout
