import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  BarChart3,
  Bell,
  Dumbbell,
  Home,
  LogOut,
  Menu,
  Moon,
  Swords,
  Search,
  Settings,
  Shield,
  Sun,
  UserCircle,
  UserRound,
} from 'lucide-react'
import websiteLogo from '../../assets/website_logo.png'
import fallbackProfilePhoto from '../../assets/crpt_image.jpg'
import { API_BASE, readProfilePreview, readSavedUser } from '../../lib/api'
import { useThemeMode } from '../../lib/theme'

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
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
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
    items: [
      { href: '#admin', icon: Home, label: 'Dashboard' },
      { href: '#admin/profile', icon: UserCircle, label: 'Profile' },
    ],
  },
  {
    label: 'Management',
    items: [
      { href: '#admin/teams', icon: Shield, label: 'Teams' },
      { href: '#admin/trainers', icon: UserRound, label: 'Trainers' },
    ],
  },
  {
    label: 'Performance',
    items: [
      { href: '#admin/matches', icon: Swords, label: 'Matches' },
      { href: '#admin/training', icon: Dumbbell, label: 'Training' },
      { href: '#admin/analytics', icon: BarChart3, label: 'Analytics' },
    ],
  },
  {
    label: 'Utilities',
    items: [{ href: '#admin/settings', icon: Settings, label: 'Settings' }],
  },
]

const notifications = [
  {
    title: 'Training plan due',
    body: '3 player assignments need review today.',
    time: '10 min ago',
  },
  {
    title: 'Roster update',
    body: 'A player readiness note was added.',
    time: '42 min ago',
  },
  {
    title: 'Match analytics ready',
    body: 'Latest team performance report is available.',
    time: '1 hr ago',
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

export const AdminModal = ({ open, title, subtitle, children, onClose, className = '' }) => {
  if (!open) return null

  return (
    <div className="admin-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`admin-modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="admin-muted">{subtitle}</p>}
          </div>
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

const getHeaderProfileImage = (user, previewUrl) => {
  if (previewUrl) return previewUrl
  if (user?.profile_picture_file_id) return `${API_BASE}/profile-pictures/${user.profile_picture_file_id}`
  return user?.profile_picture_url || fallbackProfilePhoto
}

export const AdminLayout = ({ children, title, kicker = 'Volleyball Analytics', currentPath }) => {
  const hash = currentPath || window.location.hash || '#admin'
  const searchHidden = hash.startsWith('#admin/profile') || hash.startsWith('#admin/settings')
  const navRef = useRef(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const sidebarVisible = window.innerWidth > 1100 ? !sidebarCollapsed : sidebarOpen
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [headerProfile, setHeaderProfile] = useState(() => readSavedUser())
  const [headerPreview, setHeaderPreview] = useState(() => readProfilePreview())
  const { isDark, toggleTheme } = useThemeMode()
  const headerProfileImage = getHeaderProfileImage(headerProfile, headerPreview)

  useEffect(() => {
    const syncProfile = () => {
      setHeaderProfile(readSavedUser())
      setHeaderPreview(readProfilePreview())
    }
    window.addEventListener('storage', syncProfile)
    window.addEventListener('netmind:user-updated', syncProfile)
    return () => {
      window.removeEventListener('storage', syncProfile)
      window.removeEventListener('netmind:user-updated', syncProfile)
    }
  }, [])

  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav) return undefined

    nav.scrollTop = Number(sessionStorage.getItem('netmind_admin_nav_scroll') || 0)

    const saveNavScroll = () => {
      sessionStorage.setItem('netmind_admin_nav_scroll', String(nav.scrollTop))
    }

    nav.addEventListener('scroll', saveNavScroll, { passive: true })
    return () => {
      saveNavScroll()
      nav.removeEventListener('scroll', saveNavScroll)
    }
  }, [])

  const closeSidebar = () => setSidebarOpen(false)
  const handleNavClick = () => {
    if (navRef.current) {
      sessionStorage.setItem('netmind_admin_nav_scroll', String(navRef.current.scrollTop))
    }

    if (window.innerWidth <= 1100) closeSidebar()
  }
  const closeNotifications = () => setNotificationsOpen(false)
  const closeProfile = () => setProfileOpen(false)
  const toggleSidebar = () => {
    if (window.innerWidth <= 1100) {
      setSidebarOpen((current) => !current)
      return
    }

    setSidebarCollapsed((current) => !current)
  }

  return (
    <main className={`admin-page ${sidebarOpen ? 'sidebar-open' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${isDark ? 'admin-dark' : ''}`}>
      <button
        type="button"
        className="admin-sidebar-backdrop"
        aria-label="Close sidebar"
        onClick={closeSidebar}
      />

      <aside className="admin-sidebar" aria-label="Admin sidebar">
        <div className="admin-brand-wrap">
          <a href="#admin" className="admin-logo" onClick={closeSidebar}>
            <img src={websiteLogo} alt="" aria-hidden="true" />
            <span>NetMind</span>
          </a>
        </div>

        <nav ref={navRef} className="admin-nav" aria-label="Admin navigation">
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
                    onClick={handleNavClick}
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
              aria-label={sidebarVisible ? 'Close menu' : 'Open menu'}
              aria-expanded={sidebarVisible}
              onClick={() => {
                closeNotifications()
                toggleSidebar()
              }}
              type="button"
            >
              <Menu size={21} />
            </button>

            <a href="#admin" className="admin-mobile-logo" aria-label="NetMind admin home">
              <img src={websiteLogo} alt="" aria-hidden="true" />
              <span>NetMind</span>
            </a>

            <div className="admin-header-inner">
              {!searchHidden && (
                <div className="admin-search-wrap">
                  <Search size={18} />
                  <input className="admin-search" type="search" placeholder="Search..." aria-label="Search admin" />
                </div>
              )}
            <div className="admin-title">
              <p className="admin-kicker">{kicker}</p>
              <h1>{title}</h1>
            </div>
            <div className="admin-header-actions">
              <button
                className="admin-icon-button"
                aria-label="Toggle dark mode"
                aria-pressed={isDark}
                onClick={() => {
                  closeNotifications()
                  toggleTheme()
                }}
                type="button"
              >
                {isDark ? <Moon size={20} /> : <Sun size={20} />}
              </button>
              <div className="admin-notifications">
                <button
                  className="admin-icon-button"
                  aria-label="Notifications"
                  aria-expanded={notificationsOpen}
                  aria-haspopup="menu"
                  onClick={() => setNotificationsOpen((current) => !current)}
                  type="button"
                >
                  <Bell size={21} />
                  <span className="admin-notification-dot" />
                </button>

                {notificationsOpen && (
                  <div className="admin-notification-menu" role="menu">
                    <div className="admin-notification-head">
                      <strong>Notifications</strong>
                      <span>{notifications.length} new</span>
                    </div>

                    {notifications.map((item) => (
                      <button
                        type="button"
                        className="admin-notification-item"
                        key={item.title}
                        role="menuitem"
                        onClick={closeNotifications}
                      >
                        <span>
                          <strong>{item.title}</strong>
                          <small>{item.body}</small>
                        </span>
                        <time>{item.time}</time>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="admin-profile-menu-wrap">
                <button
                  className="admin-profile-trigger"
                  aria-label="Admin profile menu"
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                  onClick={() => {
                    closeNotifications()
                    setProfileOpen((current) => !current)
                  }}
                  type="button"
                >
                  <span className="admin-profile">
                    <img
                      src={headerProfileImage}
                      alt=""
                      aria-hidden="true"
                      onError={(event) => {
                        if (event.currentTarget.src !== fallbackProfilePhoto) {
                          event.currentTarget.src = fallbackProfilePhoto
                        }
                      }}
                    />
                  </span>
                </button>

                {profileOpen && (
                  <div className="admin-profile-menu" role="menu">
                    <a href="#admin/profile" role="menuitem" onClick={closeProfile}>
                      <UserCircle size={16} />
                      Profile
                    </a>
                    <a href="#admin/settings" role="menuitem" onClick={closeProfile}>
                      <Settings size={16} />
                      Settings
                    </a>
                    <a className="admin-profile-logout" href="#auth" role="menuitem" onClick={closeProfile}>
                      <LogOut size={16} />
                      Logout
                    </a>
                  </div>
                )}
              </div>
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
