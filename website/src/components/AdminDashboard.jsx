import { Activity, BarChart3, Bell, ClipboardList, Dumbbell, Home, LogOut, Menu, Users } from 'lucide-react'

const sidebarItems = [
  { icon: Home, label: 'Dashboard', active: true },
  { icon: Users, label: 'Roster' },
  { icon: Dumbbell, label: 'Training' },
  { icon: BarChart3, label: 'Performance' },
  { icon: ClipboardList, label: 'Lineups' },
]

const chartValues = [12, 27, 10, 36, 21, 27, 22, 13, 25]
const activity = [
  { time: '--:--', text: 'Create a team to begin tracking activity', tone: 'primary' },
  { time: '--:--', text: 'Add players and trainers from the admin workspace', tone: 'warning' },
  { time: '--:--', text: 'Log matches and training to populate analytics', tone: 'secondary' },
  { time: '--:--', text: 'Performance notes will appear after sessions', tone: 'error' },
]

const readinessRows = [
  { label: 'Players', target: 'Not set', status: 'Pending', focus: 'Roster' },
  { label: 'Training', target: 'Not set', status: 'Pending', focus: 'Drills' },
  { label: 'Matches', target: 'Not set', status: 'Pending', focus: 'Schedule' },
]

const AdminCard = ({ children, className = '' }) => (
  <div className={`admin-card ${className}`}>{children}</div>
)

const AdminDashboard = () => {
  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <a href="#" className="admin-logo">
          <span>NM</span>
          NetMind
        </a>
        <nav className="admin-nav">
          {sidebarItems.map(({ icon: Icon, label, active }) => (
            <a key={label} href="#admin" className={active ? 'active' : ''}>
              <Icon size={20} />
              {label}
            </a>
          ))}
        </nav>
        <a href="#auth" className="admin-logout">
          <LogOut size={18} />
          Logout
        </a>
      </aside>

      <section className="admin-main">
        <header className="admin-header">
          <button className="admin-icon-button" aria-label="Open menu">
            <Menu size={21} />
          </button>
          <div>
            <p className="admin-kicker">Volleyball Analytics</p>
            <h1>NetMind Dashboard</h1>
          </div>
          <div className="admin-header-actions">
            <button className="admin-icon-button" aria-label="Notifications">
              <Bell size={21} />
            </button>
            <div className="admin-profile">MS</div>
          </div>
        </header>

        <div className="admin-grid">
          <AdminCard className="admin-chart-card">
            <div className="admin-card-header">
              <h2>Performance Forecast</h2>
              <select defaultValue="This Week">
                <option>This Week</option>
                <option>Serve Receive</option>
                <option>Attack</option>
                <option>Blocking</option>
              </select>
            </div>
            <div className="admin-bars" aria-label="Performance bar chart">
              {chartValues.map((value, index) => (
                <div key={index} className="admin-bar-pair">
                  <span style={{ height: `${value * 7}px` }} />
                  <i style={{ height: `${Math.max(24, (40 - value) * 2)}px` }} />
                </div>
              ))}
            </div>
          </AdminCard>

          <div className="admin-side-stack">
            <AdminCard>
              <div className="admin-metric-head">
                <div className="admin-metric-icon secondary"><Users size={24} /></div>
                <h2>Active Players</h2>
              </div>
              <div className="admin-progress-row">
                <span>No team selected</span>
                <strong>0</strong>
              </div>
              <div className="admin-progress"><span style={{ width: '0%' }} /></div>
            </AdminCard>

            <AdminCard>
              <div className="admin-metric-head">
                <div className="admin-metric-icon error"><Activity size={24} /></div>
                <h2>Point Difference</h2>
              </div>
              <div className="admin-income">
                <strong>0</strong>
                <span>No match data yet</span>
              </div>
            </AdminCard>
          </div>

          <AdminCard className="admin-table-card">
            <div className="admin-card-header">
              <h2>Player Readiness</h2>
            </div>
            <div className="admin-table">
              <div className="admin-table-row admin-table-head">
                <span>Player</span>
                <span>Target</span>
                <span>Status</span>
                <span>Focus</span>
              </div>
              {readinessRows.map((row, index) => (
                <div className="admin-table-row" key={row.label}>
                  <span className="admin-player">
                    <b>{row.label.slice(0, 2).toUpperCase()}</b>
                    <span>
                      <strong>{row.label}</strong>
                      <small>Waiting for records</small>
                    </span>
                  </span>
                  <span>{row.target}</span>
                  <span className={index === 2 ? 'admin-badge warning' : 'admin-badge success'}>
                    {row.status}
                  </span>
                  <span>{row.focus}</span>
                </div>
              ))}
            </div>
          </AdminCard>

          <AdminCard className="admin-activity-card">
            <h2>Team Activity</h2>
            <ul className="admin-timeline">
              {activity.map((item) => (
                <li key={item.text}>
                  <time>{item.time}</time>
                  <span className={item.tone} />
                  <p>{item.text}</p>
                </li>
              ))}
            </ul>
          </AdminCard>
        </div>
      </section>
    </main>
  )
}

export default AdminDashboard
