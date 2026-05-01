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
import AdminDashboard from './components/AdminDashboard'

const getRoute = () => (window.location.hash === '#admin' ? 'admin' : 'home')

function App() {
  const [modalOpen, setModalOpen] = useState(false)
  const [route, setRoute] = useState(getRoute)

  useEffect(() => {
    const handleHashChange = () => {
      const nextRoute = getRoute()
      setRoute(nextRoute)
      if (nextRoute === 'admin') {
        window.scrollTo(0, 0)
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  if (route === 'admin') {
    return <AdminDashboard />
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
