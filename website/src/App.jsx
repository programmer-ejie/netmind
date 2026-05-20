import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import AboutSection from './components/AboutSection'
import SkillsSection from './components/SkillsSection'
import ProgramsSection from './components/ProgramsSection'
import CurriculumSection from './components/CurriculumSection'
import PricingSection from './components/PricingSection'
import TestimonialsSection from './components/TestimonialsSection'
import BlogSection from './components/BlogSection'
import FAQSection from './components/FAQSection'
import CTASection from './components/CTASection'
import FooterSection from './components/FooterSection'
import AuthSection from './components/AuthSection'
import AdminAnalytics from './pages/admin/AdminAnalytics'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminMatchInputs from './pages/admin/AdminMatchInputs'
import AdminMatches from './pages/admin/AdminMatches'
import AdminNotifications from './pages/admin/AdminNotifications'
import AdminAttendance from './pages/admin/AdminAttendance'
import AdminAttendanceCheck from './pages/admin/AdminAttendanceCheck'
import AdminPlayers from './pages/admin/AdminPlayers'
import AdminProfile from './pages/admin/AdminProfile'
import AdminSettings from './pages/admin/AdminSettings'
import AdminTeamDetails from './pages/admin/AdminTeamDetails'
import AdminTeams from './pages/admin/AdminTeams'
import AdminTrainers from './pages/admin/AdminTrainers'
import AdminTraining from './pages/admin/AdminTraining'
import AdminWellness from './pages/admin/AdminWellness'
import { clearSavedUser, readSavedUser } from './lib/api'
import { useNotifications } from './lib/notifications'

const getRoute = () => {
  const hash = window.location.hash || ''
  const isCoachRoute = hash.startsWith('#coach')
  const isTrainerRoute = hash.startsWith('#trainer')
  if (!isCoachRoute && !isTrainerRoute) return { area: 'home', hash }

  const parts = hash.replace(/^#/, '').split('/')
  const page = parts[1] || 'dashboard'

  return {
    area: 'coach',
    base: parts[0],
    hash,
    page,
    id: parts[2],
    section: parts[3],
    matchNumber: parts[4],
  }
}

const getLegacyAdminRedirect = (hash) => (
  hash.startsWith('#admin') ? hash.replace(/^#admin/, '#coach') : ''
)

const scrollToPageTop = () => {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}

function NotificationSoundBridge() {
  useNotifications()
  return null
}

const getAdminRedirect = (route, currentUser) => {
  if (route.area !== 'coach') return ''
  if (!['coach', 'trainer'].includes(currentUser?.role)) return '#auth'

  const expectedBase = currentUser.role === 'trainer' ? 'trainer' : 'coach'
  if (route.base !== expectedBase) return route.hash.replace(/^#(coach|trainer)/, expectedBase)
  if (route.page === 'player-details') return '#trainer/players'

  if (currentUser.role === 'trainer' && ![
    'dashboard',
    'profile',
    'players',
    'player-stats',
    'training',
    'attendance',
    'wellness',
    'analytics',
    'notifications',
    'settings',
  ].includes(route.page)) {
    return '#trainer'
  }

  if (route.page === 'players' && currentUser.role !== 'trainer') return '#coach/teams'
  if (route.page === 'attendance' && currentUser.role !== 'trainer') return '#coach'

  return ''
}

function App() {
  const [route, setRoute] = useState(getRoute)
  const [authVersion, setAuthVersion] = useState(0)
  const currentUser = readSavedUser()

  const moveHashToAuth = useCallback(() => {
    if (window.location.hash !== '#auth') {
      window.history.replaceState(null, '', '#auth')
    }
    window.setTimeout(() => {
      document.getElementById('auth')?.scrollIntoView({ behavior: 'auto', block: 'start' })
    }, 0)
  }, [])

  const renderHome = () => (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <HeroSection />
      <AboutSection />
      <SkillsSection />
      <ProgramsSection />
      <CurriculumSection />
      <PricingSection />
      <AuthSection />
      <TestimonialsSection />
      <BlogSection />
      <FAQSection />
      <CTASection />
      <FooterSection />
    </div>
  )

  useEffect(() => {
    const handleHashChange = () => {
      const nextRoute = getRoute()
      setRoute((currentRoute) => {
        if (nextRoute.area === 'coach' || (currentRoute.area === 'coach' && nextRoute.area === 'home')) {
          scrollToPageTop()
        }

        return nextRoute
      })
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useLayoutEffect(() => {
    if (route.area !== 'home') return

    scrollToPageTop()
    const frame = window.requestAnimationFrame(scrollToPageTop)
    const timer = window.setTimeout(scrollToPageTop, 0)

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [route.area])

  useEffect(() => {
    const syncUser = () => setAuthVersion((version) => version + 1)

    window.addEventListener('storage', syncUser)
    window.addEventListener('netmind:user-updated', syncUser)
    return () => {
      window.removeEventListener('storage', syncUser)
      window.removeEventListener('netmind:user-updated', syncUser)
    }
  }, [])

  useEffect(() => {
    const legacyRedirectTarget = getLegacyAdminRedirect(window.location.hash || '')
    if (legacyRedirectTarget) {
      window.history.replaceState(null, '', legacyRedirectTarget)
      setRoute(getRoute())
      return
    }

    const redirectTarget = getAdminRedirect(route, currentUser)
    if (!redirectTarget) return

    if (redirectTarget === '#auth') {
      if (currentUser) {
        window.setTimeout(clearSavedUser, 0)
      }
      moveHashToAuth()
      return
    }

    if (window.location.hash !== redirectTarget) {
      window.location.hash = redirectTarget.replace(/^#/, '')
    }
  }, [currentUser, moveHashToAuth, route])

  if (route.area === 'coach') {
    const currentRole = currentUser?.role
    const redirectTarget = getAdminRedirect(route, currentUser)

    if (!['coach', 'trainer'].includes(currentRole)) {
      return renderHome()
    }

    if (redirectTarget) {
      return null
    }

    if (route.page === 'teams' && route.id) {
      return (
        <>
          <NotificationSoundBridge />
          <AdminTeamDetails teamId={route.id} currentPath={route.hash} />
        </>
      )
    }

    if (route.page === 'matches' && route.id) {
      return (
        <>
          <NotificationSoundBridge />
          <AdminMatchInputs matchId={route.id} matchNumber={route.matchNumber} currentPath={route.hash} />
        </>
      )
    }

    if (route.page === 'attendance' && route.id && route.section === 'check') {
      return (
        <>
          <NotificationSoundBridge />
          <AdminAttendanceCheck scheduleId={route.id} currentPath={route.hash} />
        </>
      )
    }

    const pages = {
      dashboard: AdminDashboard,
      profile: AdminProfile,
      players: AdminPlayers,
      'player-stats': AdminPlayers,
      teams: AdminTeams,
      trainers: AdminTrainers,
      matches: AdminMatches,
      training: AdminTraining,
      attendance: AdminAttendance,
      wellness: AdminWellness,
      analytics: AdminAnalytics,
      notifications: AdminNotifications,
      settings: AdminSettings,
    }
    const AdminPage = pages[route.page] || AdminDashboard
    const pageKey = `${route.hash}-${currentUser?.id || 'guest'}-${currentUser?.role || 'none'}-${authVersion}`

    return (
      <>
        <NotificationSoundBridge />
        <AdminPage key={pageKey} currentPath={route.hash} />
      </>
    )
  }

  return (
    <>
      <NotificationSoundBridge />
      {renderHome()}
    </>
  )
}

export default App
