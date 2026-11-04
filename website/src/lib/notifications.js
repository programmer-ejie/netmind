import { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import {
  API_BASE,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  readAuthToken,
  readSavedUser,
} from './api'

const SOCKET_BASE = (import.meta.env.VITE_SOCKET_BASE || API_BASE.replace(/\/api$/, '')).replace(/\/$/, '')
const NOTIFICATIONS_SYNC_EVENT = 'netmind:notifications-sync'
let lastDingNotificationId = null
let notificationAudioContext = null
let notificationAudioUnlocked = false

const normalizeNotification = (notification) => ({
  ...notification,
  data: notification?.data || {},
  is_read: Boolean(notification?.is_read),
})

const getNotificationAudioContext = () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return null

  if (!notificationAudioContext) {
    notificationAudioContext = new AudioContext()
  }

  return notificationAudioContext
}

const unlockNotificationAudio = () => {
  const context = getNotificationAudioContext()
  if (!context) return

  context.resume?.().then(() => {
    notificationAudioUnlocked = true
  }).catch(() => undefined)
}

const playNotificationDing = (notificationId) => {
  if (notificationId && lastDingNotificationId === notificationId) return
  lastDingNotificationId = notificationId || Date.now()

  const context = getNotificationAudioContext()
  if (!context) return

  try {
    if (context.state === 'suspended') {
      context.resume?.().catch(() => undefined)
      if (!notificationAudioUnlocked) return
    }

    const gain = context.createGain()
    const firstTone = context.createOscillator()
    const secondTone = context.createOscillator()
    const now = context.currentTime

    gain.connect(context.destination)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.018)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34)

    firstTone.type = 'sine'
    firstTone.frequency.setValueAtTime(880, now)
    firstTone.frequency.exponentialRampToValueAtTime(1046.5, now + 0.14)
    firstTone.connect(gain)
    firstTone.start(now)
    firstTone.stop(now + 0.18)

    secondTone.type = 'sine'
    secondTone.frequency.setValueAtTime(1318.5, now + 0.12)
    secondTone.connect(gain)
    secondTone.start(now + 0.12)
    secondTone.stop(now + 0.34)
  } catch {
    // Browser autoplay rules can block audio until the user interacts with the page.
  }
}

const broadcastNotificationsSync = (detail) => {
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_SYNC_EVENT, { detail }))
}

export function useNotifications() {
  const [items, setItems] = useState([])
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const user = readSavedUser()

  useEffect(() => {
    unlockNotificationAudio()

    window.addEventListener('pointerdown', unlockNotificationAudio, { passive: true })
    window.addEventListener('keydown', unlockNotificationAudio)
    window.addEventListener('touchstart', unlockNotificationAudio, { passive: true })

    return () => {
      window.removeEventListener('pointerdown', unlockNotificationAudio)
      window.removeEventListener('keydown', unlockNotificationAudio)
      window.removeEventListener('touchstart', unlockNotificationAudio)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!user?.id) {
        setItems([])
        setLoading(false)
        return
      }

      try {
        const rows = await listNotifications()
        if (!cancelled) setItems(rows.map(normalizeNotification))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  useEffect(() => {
    const token = readAuthToken()
    if (!token || !user?.id) return undefined

    const socket = io(SOCKET_BASE, {
      auth: { token },
      transports: ['websocket'],
    })

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('notifications:new', (notification) => {
      const nextNotification = normalizeNotification(notification)
      setItems((current) => [nextNotification, ...current])
      playNotificationDing(nextNotification.id)
      if (window.Notification?.permission === 'granted') {
        new window.Notification(notification.title, { body: notification.body })
      }
    })

    if (window.Notification && window.Notification.permission === 'default') {
      window.Notification.requestPermission().catch(() => undefined)
    }

    return () => {
      socket.disconnect()
    }
  }, [user?.id])

  useEffect(() => {
    const syncNotifications = (event) => {
      const { type, notification } = event.detail || {}

      if (type === 'read-all') {
        setItems((current) => current.map((item) => ({ ...item, is_read: true })))
      }

      if (type === 'read-one' && notification?.id) {
        const updated = normalizeNotification(notification)
        setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      }
    }

    window.addEventListener(NOTIFICATIONS_SYNC_EVENT, syncNotifications)
    return () => {
      window.removeEventListener(NOTIFICATIONS_SYNC_EVENT, syncNotifications)
    }
  }, [])

  const unreadCount = useMemo(
    () => items.filter((item) => !item.is_read).length,
    [items],
  )

  const markRead = async (id) => {
    const updated = normalizeNotification(await markNotificationRead(id))
    broadcastNotificationsSync({ type: 'read-one', notification: updated })
  }

  const markAllRead = async () => {
    await markAllNotificationsRead()
    broadcastNotificationsSync({ type: 'read-all' })
  }

  return {
    connected,
    items,
    loading,
    markAllRead,
    markRead,
    unreadCount,
  }
}
