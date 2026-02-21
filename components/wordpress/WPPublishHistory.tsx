'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { History, ChevronUp, ChevronDown } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { itemVariants } from './wp-helpers'

interface PublishHistoryEntry {
  action: string
  timestamp: unknown
  wpSiteId?: string
  wpSiteUrl?: string
}

interface WPPublishHistoryProps {
  publishHistory: PublishHistoryEntry[]
  getSiteName: (siteId?: string, siteUrl?: string) => string
  animated?: boolean
}

export function WPPublishHistory({ publishHistory, getSiteName, animated }: WPPublishHistoryProps) {
  const [historyOpen, setHistoryOpen] = useState(false)

  if (publishHistory.length === 0) return null

  const Wrapper = animated ? motion.div : 'div'
  const wrapperProps = animated ? { variants: itemVariants } : {}

  const actionLabels: Record<string, { label: string; color: string }> = {
    published: { label: '발행', color: 'text-green-600 dark:text-green-400' },
    updated: { label: '업데이트', color: 'text-blue-600 dark:text-blue-400' },
    deleted: { label: '삭제', color: 'text-red-600 dark:text-red-400' },
    scheduled: { label: '예약', color: 'text-purple-600 dark:text-purple-400' },
  }

  return (
    <Wrapper {...wrapperProps} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <Button
        variant="ghost"
        onClick={() => setHistoryOpen(!historyOpen)}
        className="w-full flex items-center justify-between p-3 h-auto rounded-none hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            발행 이력 ({publishHistory.length})
          </span>
        </div>
        {historyOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </Button>
      {historyOpen && (
        <div className="px-3 pb-3 space-y-2">
          {publishHistory.map((entry, i) => {
            const info = actionLabels[entry.action] || { label: entry.action, color: 'text-gray-600' }
            const siteName = getSiteName(entry.wpSiteId, entry.wpSiteUrl)
            return (
              <div key={i} className="flex items-center justify-between py-1.5 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${info.color}`}>
                    {info.label}
                  </span>
                  <span className="text-xs text-gray-400">
                    {siteName}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {formatDate(entry.timestamp, { includeTime: true })}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </Wrapper>
  )
}
