import { useEffect, useLayoutEffect, useState } from 'react'
import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import AboutSection from './components/AboutSection'
import SkillsSection from './components/SkillsSection'
import ProgramsSection from './components/ProgramsSection'
import CurriculumSection from './components/CurriculumSection'
import PricingSection from './components/PricingSection'
import DashboardPreview from './components/DashboardPreview'
import TestimonialsSection from './components/TestimonialsSection'
import BlogSection from './components/BlogSection'
import FAQSection from './components/FAQSection'
import CTASection from './components/CTASection'
import FooterSection from './components/FooterSection'
import LeadCaptureModal from './components/LeadCaptureModal'
import AuthSection from './components/AuthSection'
import AdminAnalytics from './pages/admin/AdminAnalytics'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminMatchInputs from './pages/admin/AdminMatchInputs'
import AdminMatches from './pages/admin/AdminMatches'
import AdminAttendance from './pages/admin/AdminAttendance'
import AdminPlayers from './pages/admin/AdminPlayers'
import AdminProfile from './pages/admin/AdminProfile'
import AdminSettings from './pages/admin/AdminSettings'
import AdminTeamDetails from './pages/admin/AdminTeamDetails'
import AdminTeams from './pages/admin/AdminTeams'
import AdminTrainers from './pages/admin/AdminTrainers'
import AdminTraining from './pages/admin/AdminTraining'
import AdminWellness from './pages/admin/AdminWellness'
import { readSavedUser } from './lib/api'

const getRoute = () => {
  const hash = window.location.hash || ''
  if (hash.startsWith('#admin')) {
    const coachHash = hash.replace(/^#admin/, '#coach')
    window.history.replaceState(null, '', coachHash)
    return getRoute()
  }
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

const scrollToPageTop = () => {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}

function App() {
  const [modalOpen, setModalOpen] = useState(false)
  const [route, setRoute] = useState(getRoute)
  const [authVersion, setAuthVersion] = useState(0)

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

  if (route.area === 'coach') {
    const currentUser = readSavedUser()
    const expectedBase = currentUser?.role === 'trainer' ? 'trainer' : 'coach'

    if (currentUser?.role && route.base !== expectedBase) {
      window.location.hash = route.hash.replace(/^#(coach|trainer)/, expectedBase)
      return null
    }

    if (currentUser?.role === 'trainer' && ![
      'dashboard',
      'profile',
      'players',
      'player-details',
      'training',
      'attendance',
      'wellness',
      'analytics',
      'settings',
    ].includes(route.page)) {
      window.location.hash = 'trainer'
      return null
    }

    if (route.page === 'players' && currentUser?.role !== 'trainer') {
      window.location.hash = 'coach/teams'
      return null
    }

    if (route.page === 'teams' && route.id) {
      return <AdminTeamDetails teamId={route.id} currentPath={route.hash} />
    }

    if (route.page === 'matches' && route.id) {
      return <AdminMatchInputs matchId={route.id} matchNumber={route.matchNumber} currentPath={route.hash} />
    }

    const pages = {
      dashboard: AdminDashboard,
      profile: AdminProfile,
      players: AdminPlayers,
      'player-details': AdminPlayers,
      teams: AdminTeams,
      trainers: AdminTrainers,
      matches: AdminMatches,
      training: AdminTraining,
      attendance: AdminAttendance,
      wellness: AdminWellness,
      analytics: AdminAnalytics,
      settings: AdminSettings,
    }
    const AdminPage = pages[route.page] || AdminDashboard
    const pageKey = `${route.hash}-${currentUser?.id || 'guest'}-${currentUser?.role || 'none'}-${authVersion}`

    return <AdminPage key={pageKey} currentPath={route.hash} />
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <HeroSection onOpenModal={() => setModalOpen(true)} />
      <AboutSection />
      <SkillsSection />
      <ProgramsSection />
      <CurriculumSection />
      <PricingSection />
      <AuthSection />
      <DashboardPreview />
      <TestimonialsSection />
      <BlogSection />
      <FAQSection />
      <CTASection />
      <FooterSection />
      <LeadCaptureModal open={modalOpen} onClose={() => setModalOpen(false)} />

      <button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-6 right-6 z-50 glow-button rounded-full px-5 py-3 text-sm font-bold md:hidden"
      >
        Demo
      </button>
    </div>
  )
}

export default App
