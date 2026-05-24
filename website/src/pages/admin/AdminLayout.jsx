/* eslint-disable react-refresh/only-export-components */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart3,
  Bell,
  ClipboardCheck,
  Dumbbell,
  Home,
  LogOut,
  Menu,
  Moon,
  HeartPulse,
  Swords,
  Search,
  Settings,
  Shield,
  Sun,
  UserCircle,
  UserRound,
  UsersRound,
} from 'lucide-react'
import websiteLogo from '../../assets/website_logo.png'
import fallbackProfilePhoto from '../../assets/default-profilepc.webp'
import { API_BASE, clearSavedUser, readProfilePreview, readSavedUser } from '../../lib/api'
import { parseDateInput } from '../../lib/dateKeys'
import { useNotifications } from '../../lib/notifications'
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
  const date = parseDateInput(value)
  return !date
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
      { href: '#coach', icon: Home, label: 'Dashboard' },
      { href: '#coach/profile', icon: UserCircle, label: 'Profile' },
    ],
  },
  {
    label: 'Management',
    items: [
      { href: '#coach/teams', icon: Shield, label: 'Teams' },
      { href: '#coach/trainers', icon: UserRound, label: 'Trainers' },
    ],
  },
  {
    label: 'Performance',
    items: [
      { href: '#coach/matches', icon: Swords, label: 'Matches' },
      { href: '#coach/training', icon: Dumbbell, label: 'Training' },
      { href: '#coach/analytics', icon: BarChart3, label: 'Analytics' },
      { href: '#coach/notifications', icon: Bell, label: 'Notifications' },
    ],
  },
  {
    label: 'Utilities',
    items: [{ href: '#coach/settings', icon: Settings, label: 'Settings' }],
  },
]

const hiddenCoachNavigationHrefs = new Set(['#coach/training'])
const trainerSidebarGroups = [
  {
    label: 'Dashboards',
    items: [
      { href: '#trainer', icon: Home, label: 'Dashboard' },
      { href: '#trainer/profile', icon: UserCircle, label: 'Profile' },
    ],
  },
  {
    label: 'Trainer',
    items: [
      { href: '#trainer/players', icon: UsersRound, label: 'My Players' },
      { href: '#trainer/attendance', icon: ClipboardCheck, label: 'Attendance' },
      { href: '#trainer/training', icon: Dumbbell, label: 'Training Hub' },
      { href: '#trainer/wellness', icon: HeartPulse, label: 'Wellness Log' },
    ],
  },
  {
    label: 'Performance',
    items: [
      { href: '#trainer/analytics', icon: BarChart3, label: 'Analytics' },
      { href: '#trainer/notifications', icon: Bell, label: 'Notifications' },
    ],
  },
  {
    label: 'Utilities',
    items: [{ href: '#trainer/settings', icon: Settings, label: 'Settings' }],
  },
]

const getUserRole = (user) => (user?.role || 'coach').toLowerCase()

const getSidebarGroupsForUser = (user) => {
  const role = getUserRole(user)

  if (role === 'trainer') {
    return trainerSidebarGroups
  }

  return sidebarGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => !hiddenCoachNavigationHrefs.has(item.href)),
  }))
}

const normalizeActiveHash = (hash) => {
  if (hash.startsWith('#trainer/player-stats')) return '#trainer/players'
  if (hash.startsWith('#coach/player-stats')) return '#coach/players'
  return hash
}

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

const getButtonText = (children) => {
  if (typeof children === 'string' || typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(getButtonText).join(' ')
  if (children?.props?.children) return getButtonText(children.props.children)
  return ''
}

export const AdminButton = ({ children, variant = 'primary', className = '', ...props }) => {
  const buttonText = getButtonText(children).trim().toLowerCase()
  const isCancel = buttonText === 'cancel'
  const isSuccessAction = variant === 'primary' && /^(save|add|confirm)\b/.test(buttonText)

  return (
  <button
    className={`admin-button ${variant} ${isCancel ? 'admin-cancel-button' : ''} ${isSuccessAction ? 'admin-success-action-button' : ''} ${className}`}
    {...props}
  >
    {children}
  </button>
  )
}

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

export const StatCardSkeleton = ({ label = 'Loading stat' }) => (
  <AdminCard className="admin-stat-card admin-stat-card-skeleton" aria-label={label}>
    <span className="admin-skeleton-square" />
    <span className="admin-skeleton-line" />
    <strong className="admin-skeleton-line short" />
  </AdminCard>
)

export const TableSkeletonRows = ({ rows = 4, columns = 4 }) => (
  <>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <tr key={`table-skeleton-${rowIndex}`}>
        {Array.from({ length: columns }).map((__, columnIndex) => (
          <td key={`table-skeleton-${rowIndex}-${columnIndex}`}>
            <span className={`admin-skeleton-line ${columnIndex === 0 ? 'wide' : columnIndex === columns - 1 ? 'short' : ''}`} />
          </td>
        ))}
      </tr>
    ))}
  </>
)

export const ListSkeleton = ({ rows = 4 }) => (
  <div className="admin-skeleton-list" aria-label="Loading content">
    {Array.from({ length: rows }).map((_, index) => <span key={`list-skeleton-${index}`} />)}
  </div>
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

export const AdminLayout = ({ children, title, kicker, currentPath }) => {
  const hash = currentPath || window.location.hash || '#coach'
  const activeHash = normalizeActiveHash(hash)
  const searchHidden = /^#(coach|trainer)\/(profile|settings)/.test(hash)
  const navRef = useRef(null)
  const contentRef = useRef(null)
  const searchInputRef = useRef(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const sidebarVisible = window.innerWidth > 1100 ? !sidebarCollapsed : sidebarOpen
  const [searchTerm, setSearchTerm] = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [headerProfile, setHeaderProfile] = useState(() => readSavedUser())
  const [headerPreview, setHeaderPreview] = useState(() => readProfilePreview())
  const { isDark, toggleTheme } = useThemeMode()
  const {
    connected: notificationsConnected,
    items: notifications,
    markRead,
    unreadCount,
  } = useNotifications()
  const latestMenuNotifications = useMemo(() => (
    [...notifications]
      .sort((a, b) => {
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
        return bTime - aTime || Number(b.id || 0) - Number(a.id || 0)
      })
      .slice(0, 5)
  ), [notifications])
  const headerProfileImage = getHeaderProfileImage(headerProfile, headerPreview)
  const role = getUserRole(headerProfile)
  const sidebarGroupsForUser = getSidebarGroupsForUser(headerProfile)
  const workspaceKicker = kicker || (role === 'trainer' ? 'Trainer Workspace' : 'Coach Workspace')
  const workspaceRoot = role === 'trainer' ? '#trainer' : '#coach'

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

  useEffect(() => {
    setSearchTerm('')
    setMobileSearchOpen(false)
  }, [currentPath])

  useEffect(() => {
    if (mobileSearchOpen) searchInputRef.current?.focus()
  }, [mobileSearchOpen])

  useEffect(() => {
    const content = contentRef.current
    if (!content) return

    const query = searchTerm.trim().toLowerCase()
    const rows = content.querySelectorAll('.admin-native-table tbody tr')

    rows.forEach((row) => {
      const matches = !query || row.textContent.toLowerCase().includes(query)
      row.classList.toggle('admin-search-hidden-row', !matches)
    })

    const tables = content.querySelectorAll('.admin-table')
    tables.forEach((tableWrap) => {
      const tableRows = tableWrap.querySelectorAll('.admin-native-table tbody tr')
      const visibleRows = tableWrap.querySelectorAll('.admin-native-table tbody tr:not(.admin-search-hidden-row)')
      tableWrap.classList.toggle('admin-table-search-empty', Boolean(query) && tableRows.length > 0 && visibleRows.length === 0)
    })
  })

  const closeSidebar = () => setSidebarOpen(false)
  const handleNavClick = () => {
    if (navRef.current) {
      sessionStorage.setItem('netmind_admin_nav_scroll', String(navRef.current.scrollTop))
    }

    if (window.innerWidth <= 1100) closeSidebar()
  }
  const closeNotifications = () => setNotificationsOpen(false)
  const closeProfile = () => setProfileOpen(false)
  const logout = () => {
    closeProfile()
    clearSavedUser()
    window.location.hash = 'auth'
    window.setTimeout(() => {
      document.getElementById('auth')?.scrollIntoView({ behavior: 'auto', block: 'start' })
    }, 0)
  }
  const toggleSidebar = () => {
    if (window.innerWidth <= 1100) {
      setSidebarOpen((current) => !current)
      return
    }

    setSidebarCollapsed((current) => !current)
  }

  return (
    <main className={`admin-page ${sidebarOpen ? 'sidebar-open' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileSearchOpen ? 'mobile-search-open' : ''} ${isDark ? 'admin-dark' : ''}`}>
      <button
        type="button"
        className="admin-sidebar-backdrop"
        aria-label="Close sidebar"
        onClick={closeSidebar}
      />

      <aside className="admin-sidebar" aria-label="Coach sidebar">
        <div className="admin-brand-wrap">
          <a href={workspaceRoot} className="admin-logo" onClick={closeSidebar}>
            <img src={websiteLogo} alt="" aria-hidden="true" />
            <span>NetMind</span>
          </a>
        </div>

        <nav ref={navRef} className="admin-nav" aria-label="Coach navigation">
          {sidebarGroupsForUser.map((group) => (
            <div className="admin-nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map(({ href, icon: Icon, label }) => {
                const isActive = href === workspaceRoot
                  ? activeHash === workspaceRoot
                  : activeHash === href || activeHash.startsWith(`${href}/`)

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

        <button type="button" className="admin-logout" onClick={logout}>
          <LogOut size={18} />
          Logout
        </button>
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

            <a href={workspaceRoot} className="admin-mobile-logo" aria-label="NetMind workspace home">
              <img src={websiteLogo} alt="" aria-hidden="true" />
              <span>NetMind</span>
            </a>

            <div className="admin-header-inner">
              {!searchHidden && (
                <div className="admin-search-wrap">
                  <Search size={18} />
                  <input
                    ref={searchInputRef}
                    className="admin-search"
                    type="search"
                    placeholder="Search..."
                    aria-label="Search visible tables"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>
              )}
            <div className="admin-title">
              <p className="admin-kicker">{workspaceKicker}</p>
              <h1>{title}</h1>
            </div>
            <div className="admin-header-actions">
              {!searchHidden && (
                <button
                  className="admin-icon-button admin-mobile-search-toggle"
                  aria-label={mobileSearchOpen ? 'Close search' : 'Open search'}
                  aria-expanded={mobileSearchOpen}
                  onClick={() => setMobileSearchOpen((current) => !current)}
                  type="button"
                >
                  <Search size={20} />
                </button>
              )}
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
                  {unreadCount > 0 && <span className="admin-notification-dot" />}
                </button>

                {notificationsOpen && (
                  <div className="admin-notification-menu" role="menu">
                    <div className="admin-notification-head">
                      <strong>Notifications</strong>
                      <span>{notificationsConnected ? 'Live' : `${unreadCount} unread`}</span>
                    </div>

                    {latestMenuNotifications.map((item) => (
                      <button
                        type="button"
                        className={`admin-notification-item ${item.is_read ? '' : 'unread'}`}
                        key={item.id}
                        role="menuitem"
                        onClick={() => {
                          if (!item.is_read) markRead(item.id)
                          closeNotifications()
                        }}
                      >
                        <span>
                          <strong>{item.title}</strong>
                          <small>{item.body}</small>
                        </span>
                        <time>{item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</time>
                      </button>
                    ))}
                    <a className="admin-notification-all" href={`${workspaceRoot}/notifications`} onClick={closeNotifications}>
                      View all notifications
                    </a>
                  </div>
                )}
              </div>
              <div className="admin-profile-menu-wrap">
                <button
                  className="admin-profile-trigger"
                  aria-label="Coach profile menu"
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
                    <a href={`${workspaceRoot}/profile`} role="menuitem" onClick={closeProfile}>
                      <UserCircle size={16} />
                      Profile
                    </a>
                    <a href={`${workspaceRoot}/settings`} role="menuitem" onClick={closeProfile}>
                      <Settings size={16} />
                      Settings
                    </a>
                    <button type="button" className="admin-profile-logout" role="menuitem" onClick={logout}>
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          </nav>
        </header>

        <div className="admin-content" ref={contentRef}>
          {children}
        </div>
      </section>
    </main>
  )
}

export default AdminLayout
