import { useEffect, useState } from 'react'
import { Menu, Moon, Sun, X } from 'lucide-react'
import { siteContent } from '../data/netmindData'
import { useThemeMode } from '../lib/theme'

const navLinks = [
  { label: 'About', href: '#about' },
  { label: 'Data', href: '#courses' },
  { label: 'Workflow', href: '#curriculum' },
  { label: 'Roles', href: '#pricing' },
  { label: 'Updates', href: '#blog' },
  { label: 'FAQ', href: '#faq' },
]

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { isDark, toggleTheme } = useThemeMode()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass-card border-b py-3' : 'py-5 bg-transparent'
      }`}
    >
      <div className="container mx-auto flex items-center justify-between px-4">
        <a href="#" className="text-xl font-bold glow-text">
          {siteContent.name}
        </a>

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <a href="#auth" className="glow-button text-sm">
            Login
          </a>
        </div>

        <div className="flex md:hidden items-center gap-2">
          <button onClick={toggleTheme} className="p-2 text-muted-foreground" aria-label="Toggle theme">
            {isDark ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-foreground" aria-label="Toggle menu">
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden glass-card mt-2 mx-4 p-4 rounded-xl">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className="block py-2 text-muted-foreground hover:text-primary transition-colors"
            >
              {link.label}
            </a>
          ))}
          <a href="#auth" className="glow-button block text-center mt-3 text-sm">
            Login
          </a>
        </div>
      )}
    </nav>
  )
}

export default Navbar
