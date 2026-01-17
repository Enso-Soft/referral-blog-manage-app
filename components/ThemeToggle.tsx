'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
        <Monitor className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </button>
    )
  }

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  const getIcon = () => {
    if (theme === 'light') {
      return <Sun className="w-4 h-4" />
    } else if (theme === 'dark') {
      return <Moon className="w-4 h-4" />
    } else {
      return <Monitor className="w-4 h-4" />
    }
  }

  const getLabel = () => {
    if (theme === 'light') return '라이트 모드'
    if (theme === 'dark') return '다크 모드'
    return '시스템 설정'
  }

  return (
    <button
      onClick={cycleTheme}
      className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      title={getLabel()}
    >
      {getIcon()}
    </button>
  )
}
