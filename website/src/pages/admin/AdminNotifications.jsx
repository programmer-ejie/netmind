import { useEffect, useMemo, useState } from 'react'
import { Bell, CheckCheck, ChevronLeft, ChevronRight, Radio, SearchCheck } from 'lucide-react'
import AdminLayout, { AdminButton, ListSkeleton, StatusBadge, formatDate } from './AdminLayout'
import { useNotifications } from '../../lib/notifications'

const NOTIFICATIONS_PER_PAGE = 5

const formatTime = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return formatDate(value)
  return date.toLocaleString()
}

export default function AdminNotifications({ currentPath }) {
  const { connected, items, loading, markAllRead, markRead, unreadCount } = useNotifications()
  const [notificationsPage, setNotificationsPage] = useState(1)
  const readCount = Math.max(items.length - unreadCount, 0)
  const totalNotificationPages = Math.max(1, Math.ceil(items.length / NOTIFICATIONS_PER_PAGE))
  const visibleNotifications = useMemo(() => {
    const start = (notificationsPage - 1) * NOTIFICATIONS_PER_PAGE
    return items.slice(start, start + NOTIFICATIONS_PER_PAGE)
  }, [items, notificationsPage])

  useEffect(() => {
    setNotificationsPage((current) => Math.min(Math.max(current, 1), totalNotificationPages))
  }, [totalNotificationPages])

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
            <ListSkeleton rows={4} />
          </div>
        ) : items.length ? (
          <>
            {visibleNotifications.map((item) => (
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
            ))}
            <div className="admin-pagination" aria-label="Notifications pagination">
              <button
                type="button"
                className="admin-pagination-button"
                aria-label="Previous notifications page"
                disabled={notificationsPage <= 1}
                onClick={() => setNotificationsPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft size={17} />
              </button>
              <span>Page {notificationsPage} of {totalNotificationPages}</span>
              <button
                type="button"
                className="admin-pagination-button"
                aria-label="Next notifications page"
                disabled={notificationsPage >= totalNotificationPages}
                onClick={() => setNotificationsPage((current) => Math.min(totalNotificationPages, current + 1))}
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </>
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
