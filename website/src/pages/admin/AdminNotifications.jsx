import { Bell, CheckCheck, Radio, SearchCheck } from 'lucide-react'
import AdminLayout, { AdminButton, StatusBadge, formatDate } from './AdminLayout'
import { useNotifications } from '../../lib/notifications'

const formatTime = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return formatDate(value)
  return date.toLocaleString()
}

export default function AdminNotifications({ currentPath }) {
  const { connected, items, loading, markAllRead, markRead, unreadCount } = useNotifications()
  const readCount = Math.max(items.length - unreadCount, 0)

  return (
    <AdminLayout
      title="Notifications"
      kicker={connected ? 'Live Notifications' : 'Notification History'}
      currentPath={currentPath}
    >
      <section className="admin-notifications-shell">
        <div className="admin-notifications-hero">
          <div className="admin-notifications-title">
            <span className="admin-notifications-hero-icon">
              <Bell size={22} />
            </span>
            <div>
              <h2>Team activity inbox</h2>
              <p>Roster, training, wellness, attendance, injury, and match updates appear here in real time.</p>
            </div>
          </div>
          <AdminButton variant="secondary" onClick={markAllRead} disabled={!unreadCount}>
            <CheckCheck size={16} />
            Mark all read
          </AdminButton>
        </div>

        <div className="admin-notifications-summary" aria-label="Notification summary">
          <div>
            <span>Unread</span>
            <strong>{unreadCount}</strong>
          </div>
          <div>
            <span>Read</span>
            <strong>{readCount}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong className={connected ? 'online' : ''}>{connected ? 'Live' : 'History'}</strong>
          </div>
        </div>

        <div className="admin-notifications-page">
        {loading ? (
          <div className="admin-notifications-empty compact">
            <span className="admin-notifications-empty-icon">
              <Radio size={22} />
            </span>
            <strong>Loading notifications</strong>
            <p>Checking your latest team updates.</p>
          </div>
        ) : items.length ? (
          items.map((item) => (
            <button
              type="button"
              className={`admin-notification-row ${item.is_read ? '' : 'unread'}`}
              key={item.id}
              onClick={() => {
                if (!item.is_read) markRead(item.id)
              }}
            >
              <span className="admin-notification-row-icon">
                <Bell size={18} />
              </span>
              <span className="admin-notification-row-copy">
                <strong>{item.title}</strong>
                <small>{item.body}</small>
                <time>{formatTime(item.created_at)}</time>
              </span>
              {!item.is_read && <StatusBadge tone="warning">New</StatusBadge>}
            </button>
          ))
        ) : (
          <div className="admin-notifications-empty">
            <span className="admin-notifications-empty-icon">
              <SearchCheck size={28} />
            </span>
            <strong>No notifications yet</strong>
            <p>Your inbox is clear. New matches, drills, attendance, wellness, injury, account, and schedule updates will show here.</p>
          </div>
        )}
        </div>
      </section>
    </AdminLayout>
  )
}
