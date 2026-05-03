import { useEffect, useState } from 'react'

export const THEME_KEY = 'theme'
export const ADMIN_THEME_KEY = 'netmind_admin_theme'
export const THEME_EVENT = 'netmind-theme-change'
export const DEFAULT_THEME = 'dark'

export const getSavedTheme = () => {
  try {
    return localStorage.getItem(THEME_KEY) || localStorage.getItem(ADMIN_THEME_KEY) || DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

export const applyTheme = (theme) => {
  const nextTheme = theme === 'light' ? 'light' : 'dark'
  document.documentElement.classList.toggle('light', nextTheme === 'light')
  document.documentElement.classList.toggle('dark', nextTheme === 'dark')
  return nextTheme
}

export const setSavedTheme = (theme) => {
  const nextTheme = applyTheme(theme)

  try {
    localStorage.setItem(THEME_KEY, nextTheme)
    localStorage.setItem(ADMIN_THEME_KEY, nextTheme)
  } catch {
    // Ignore unavailable storage.
  }

  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: nextTheme }))
  return nextTheme
}

export const initializeTheme = () => {
  const theme = getSavedTheme()
  applyTheme(theme)

  try {
    localStorage.setItem(THEME_KEY, theme)
    localStorage.setItem(ADMIN_THEME_KEY, theme)
  } catch {
    // Ignore unavailable storage.
  }

  return theme
}

export const useThemeMode = () => {
  const [theme, setTheme] = useState(() => initializeTheme())

  useEffect(() => {
    const handleThemeChange = (event) => {
      setTheme(event.detail || getSavedTheme())
    }

    const handleStorage = (event) => {
      if (event.key === THEME_KEY || event.key === ADMIN_THEME_KEY) {
        setTheme(applyTheme(event.newValue || DEFAULT_THEME))
      }
    }

    window.addEventListener(THEME_EVENT, handleThemeChange)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener(THEME_EVENT, handleThemeChange)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const toggleTheme = () => {
    setTheme((current) => setSavedTheme(current === 'dark' ? 'light' : 'dark'))
  }

  return {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
  }
}
