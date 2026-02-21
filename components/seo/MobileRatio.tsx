'use client'

import { motion } from 'framer-motion'
import { Monitor, Smartphone } from 'lucide-react'

export function MobileRatio({ pcVolume, mobileVolume }: { pcVolume: number; mobileVolume: number }) {
  const total = pcVolume + mobileVolume
  if (total === 0) return null
  const mobilePercent = Math.round((mobileVolume / total) * 100)
  const pcPercent = 100 - mobilePercent

  return (
    <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="flex items-center gap-1.5 font-medium text-blue-600 dark:text-blue-400">
          <Monitor className="w-3.5 h-3.5" /> PC {pcPercent}%
        </span>
        <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
          <Smartphone className="w-3.5 h-3.5" /> 모바일 {mobilePercent}%
        </span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
        <motion.div
          className="bg-gradient-to-r from-blue-400 to-blue-500 dark:from-blue-500 dark:to-blue-400"
          initial={{ width: 0 }}
          animate={{ width: `${pcPercent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        <motion.div
          className="bg-gradient-to-r from-emerald-400 to-emerald-500 dark:from-emerald-500 dark:to-emerald-400"
          initial={{ width: 0 }}
          animate={{ width: `${mobilePercent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
        />
      </div>
    </div>
  )
}
