'use client'

import { motion } from 'framer-motion'

export function CompetitionBadge({ value }: { value: string }) {
  const config: Record<string, { label: string; className: string }> = {
    low: { label: '낮음', className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border border-green-200 dark:border-green-800/50' },
    medium: { label: '중간', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800/50' },
    high: { label: '높음', className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-800/50' },
  }
  const c = config[value] || { label: value, className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600' }

  return (
    <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full ${c.className}`}>
      {c.label}
    </span>
  )
}

export function DifficultyBar({ score }: { score: number }) {
  const gradientColor = score <= 30
    ? 'from-green-400 to-green-500'
    : score <= 60
      ? 'from-yellow-400 to-orange-500'
      : 'from-orange-500 to-red-500'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-2.5 bg-gradient-to-r ${gradientColor} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className="text-sm font-bold tabular-nums w-8 text-right">{score}</span>
    </div>
  )
}

export function DifficultyLevelBadge({ level, score }: { level?: string; score?: number }) {
  const getConfig = () => {
    if (score !== undefined) {
      if (score <= 30) return { className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' }
      if (score <= 50) return { className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' }
      if (score <= 75) return { className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' }
      return { className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
    }
    return { className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' }
  }
  const config = getConfig()
  const label = level || (score !== undefined ? `${score}/100` : '')

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.className}`}>
      {label}
    </span>
  )
}
