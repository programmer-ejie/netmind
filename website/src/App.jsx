import { useEffect, useState } from 'react'
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
import DownloadButton from './components/DownloadButton'
import AuthSection from './components/AuthSection'
import AdminAnalytics from './pages/admin/AdminAnalytics'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminPlayers from './pages/admin/AdminPlayers'
import AdminSettings from './pages/admin/AdminSettings'
import AdminTeamDetails from './pages/admin/AdminTeamDetails'
import AdminTeams from './pages/admin/AdminTeams'
import AdminTrainers from './pages/admin/AdminTrainers'
import AdminTraining from './pages/admin/AdminTraining'

const getRoute = () => {
  const hash = window.location.hash || ''
  if (!hash.startsWith('#admin')) return { area: 'home', hash }

  const parts = hash.replace(/^#/, '').split('/')
  const page = parts[1] || 'dashboard'

  return {
    area: 'admin',
    hash,
    page,
    id: parts[2],
  }
}

function App() {
  const [modalOpen, setModalOpen] = useState(false)
  const [route, setRoute] = useState(getRoute)

  useEffect(() => {
    const handleHashChange = () => {
      const nextRoute = getRoute()
      setRoute(nextRoute)
      if (nextRoute.area === 'admin') {
        window.scrollTo(0, 0)
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  if (route.area === 'admin') {
    if (route.page === 'teams' && route.id) {
      return <AdminTeamDetails teamId={route.id} currentPath={route.hash} />
    }

    const pages = {
      dashboard: AdminDashboard,
      teams: AdminTeams,
      players: AdminPlayers,
      trainers: AdminTrainers,
      training: AdminTraining,
      analytics: AdminAnalytics,
      settings: AdminSettings,
    }
    const AdminPage = pages[route.page] || AdminDashboard

    return <AdminPage currentPath={route.hash} />
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
      <DownloadButton />
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
