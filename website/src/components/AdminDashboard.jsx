import { Activity, BarChart3, Bell, ClipboardList, Dumbbell, Home, LogOut, Menu, Users } from 'lucide-react'
import { players, staticData } from '../data/netmindData'

const sidebarItems = [
  { icon: Home, label: 'Dashboard', active: true },
  { icon: Users, label: 'Roster' },
  { icon: Dumbbell, label: 'Training' },
  { icon: BarChart3, label: 'Performance' },
  { icon: ClipboardList, label: 'Lineups' },
]

const chartValues = [12, 27, 10, 36, 21, 27, 22, 13, 25]
const activity = [
  { time: '08:00', text: '2026 Summer League activated', tone: 'primary' },
  { time: '08:15', text: 'Transition Attack Read assigned to Ari Lim', tone: 'warning' },
  { time: '09:30', text: 'Cebu Spikers match finalized as 3-1 win', tone: 'secondary' },
  { time: '10:05', text: 'Bianca Tan injury note added for ankle soreness', tone: 'error' },
]

const AdminCard = ({ children, className = '' }) => (
  <div className={`admin-card ${className}`}>{children}</div>
)

const AdminDashboard = () => {
  const ranking = staticData.team_rankings[0]
  const team = staticData.teams[0]

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
                <span>{team.team_name}</span>
                <strong>{players.length}/3</strong>
              </div>
              <div className="admin-progress"><span style={{ width: '100%' }} /></div>
            </AdminCard>

            <AdminCard>
              <div className="admin-metric-head">
                <div className="admin-metric-icon error"><Activity size={24} /></div>
                <h2>Point Difference</h2>
              </div>
              <div className="admin-income">
                <strong>+{ranking.point_difference}</strong>
                <span>100% win rate</span>
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
              {players.map((player, index) => (
                <div className="admin-table-row" key={player.id}>
                  <span className="admin-player">
                    <b>{player.name.slice(0, 2).toUpperCase()}</b>
                    <span>
                      <strong>{player.name}</strong>
                      <small>#{player.jersey_number} - {player.position}</small>
                    </span>
                  </span>
                  <span>{index === 0 ? '60%' : index === 1 ? '72%' : 'Limited'}</span>
                  <span className={index === 2 ? 'admin-badge warning' : 'admin-badge success'}>
                    {index === 2 ? 'Monitor' : 'Ready'}
                  </span>
                  <span>{index === 0 ? 'Spiking' : index === 1 ? 'Serving' : 'Recovery'}</span>
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
