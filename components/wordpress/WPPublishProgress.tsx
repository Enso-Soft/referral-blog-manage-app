'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, CheckCircle2, AlertCircle, Globe, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SitePublishStatus } from './wp-helpers'

interface WPPublishProgressProps {
  publishing: boolean
  selectedSiteIds: string[]
  sortedSelectedSiteIds: string[]
  publishingSiteStatus: Record<string, SitePublishStatus>
  publishStatus: 'draft' | 'publish' | 'future'
  currentPublishMessage: string
  getSiteName: (siteId: string) => string
  onPublish: () => void
}

export function WPPublishProgress({
  publishing,
  selectedSiteIds,
  sortedSelectedSiteIds,
  publishingSiteStatus,
  publishStatus,
  currentPublishMessage,
  getSiteName,
  onPublish,
}: WPPublishProgressProps) {
  return (
    <div className="sticky bottom-0 px-6 py-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-100 dark:border-gray-800">
      <AnimatePresence mode="wait">
        {publishing ? (
          <motion.div
            key="publishing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <div className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-md">
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-white mb-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={selectedSiteIds.length <= 1 ? currentPublishMessage : 'multi'}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                  >
                    {selectedSiteIds.length <= 1
                      ? currentPublishMessage
                      : `${selectedSiteIds.length}개 사이트에 발행 중...`
                    }
                  </motion.span>
                </AnimatePresence>
              </div>

              {/* Per-site status (multi-site) */}
              {selectedSiteIds.length > 1 && (
                <div className="space-y-1 mt-2 pt-2 border-t border-white/20">
                  {sortedSelectedSiteIds.map(siteId => {
                    const status = publishingSiteStatus[siteId]
                    return (
                      <div key={siteId} className="flex items-center justify-between text-xs text-white/80">
                        <span className="truncate max-w-[60%]">{getSiteName(siteId)}</span>
                        <span className="flex items-center gap-1.5">
                          {status?.status === 'success' && <CheckCircle2 className="w-3 h-3 text-green-300" />}
                          {status?.status === 'failed' && <AlertCircle className="w-3 h-3 text-red-300" />}
                          {(!status || ['pending', 'resolving_tags', 'publishing'].includes(status?.status)) && (
                            <Loader2 className="w-3 h-3 animate-spin text-white/60" />
                          )}
                          <span className="text-white/60">
                            {!status || status.status === 'pending' ? '대기 중' :
                             status.status === 'resolving_tags' ? '태그 처리 중' :
                             status.status === 'publishing' ? '발행 중' :
                             status.status === 'success' ? '완료' : '실패'}
                          </span>
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Progress bar */}
              <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mt-2">
                <motion.div
                  className="h-full w-1/3 bg-white/60 rounded-full"
                  animate={{ x: ['0%', '200%', '0%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="publish-btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={onPublish}
              disabled={publishing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 h-auto text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg"
            >
              {publishStatus === 'future' ? (
                <Clock className="w-4 h-4" />
              ) : (
                <Globe className="w-4 h-4" />
              )}
              {selectedSiteIds.length <= 1
                ? (publishStatus === 'future' ? 'WordPress에 예약 발행' : 'WordPress에 발행')
                : (publishStatus === 'future'
                    ? `${selectedSiteIds.length}개 사이트에 예약 발행`
                    : `${selectedSiteIds.length}개 사이트에 발행`)
              }
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
