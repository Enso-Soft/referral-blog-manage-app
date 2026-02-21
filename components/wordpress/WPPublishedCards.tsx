'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  ExternalLink,
  AlertCircle,
  Globe,
  Trash2,
  RefreshCw,
  Plus,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/responsive-dialog'
import { WPPublishHistory } from './WPPublishHistory'
import {
  extractDomain,
  timestampToMs,
  getStoredSiteSelections,
  type WPSiteInfo,
} from './wp-helpers'
import type { NormalizedWordPressData } from '@/lib/wordpress-api'

interface PublishedSiteEntry {
  siteId: string
  data: NormalizedWordPressData['sites'][string]
  siteInfo?: WPSiteInfo
}

interface WPPublishedCardsProps {
  publishedSites: PublishedSiteEntry[]
  unpublishedSites: WPSiteInfo[]
  normalizedWP: NormalizedWordPressData
  postUpdatedAt?: unknown
  error: string
  updatingSiteIds: Set<string>
  deleting: boolean
  getSiteName: (siteId?: string, siteUrl?: string) => string
  onSiteUpdate: (siteId: string) => void
  onSiteDelete: (siteId: string) => void
  onPublishToAnother: () => void
}

export function WPPublishedCards({
  publishedSites,
  unpublishedSites,
  normalizedWP,
  postUpdatedAt,
  error,
  updatingSiteIds,
  deleting,
  getSiteName,
  onSiteUpdate,
  onSiteDelete,
  onPublishToAnother,
}: WPPublishedCardsProps) {
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)

  const publishHistory = [...normalizedWP.publishHistory].reverse()

  return (
    <div className="p-6 space-y-4">
      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Per-site cards */}
      {publishedSites.map(({ siteId, data, siteInfo }) => {
        const isPublished = data.postStatus === 'published'
        const isScheduled = data.postStatus === 'scheduled'
        const isFailed = data.postStatus === 'failed'
        const needsUpdate = isPublished && data.lastSyncedAt && postUpdatedAt
          ? timestampToMs(postUpdatedAt) > timestampToMs(data.lastSyncedAt)
          : false
        const siteName = siteInfo?.displayName || (data.wpSiteUrl ? extractDomain(data.wpSiteUrl) : siteId)
        const siteHost = data.wpSiteUrl ? extractDomain(data.wpSiteUrl) : (siteInfo?.siteUrl ? extractDomain(siteInfo.siteUrl) : '')
        const showHost = siteHost && siteName !== siteHost
        const isUpdatingThis = updatingSiteIds.has(siteId)

        return (
          <motion.div
            key={siteId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`p-4 rounded-lg border ${
              isFailed
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : isScheduled
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                  : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            }`}
          >
            {/* Site name + status badge */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  {siteName}
                </span>
                {showHost && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {siteHost}
                  </span>
                )}
              </div>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                isFailed
                  ? 'bg-red-100 dark:bg-red-800/40 text-red-700 dark:text-red-300'
                  : isScheduled
                    ? 'bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300'
                    : 'bg-green-100 dark:bg-green-800/40 text-green-700 dark:text-green-300'
              }`}>
                {isFailed ? '실패' : isScheduled ? '예약됨' : '발행됨'}
              </span>
            </div>

            {/* URL */}
            {data.wpPostUrl && (
              <p className="text-xs text-gray-500 dark:text-gray-400 break-all mb-2">
                {data.wpPostUrl}
              </p>
            )}

            {/* Scheduled time */}
            {isScheduled && data.scheduledAt && (
              <p className="text-xs text-blue-500 dark:text-blue-400 mb-2">
                예약 일시: {formatDate(data.scheduledAt, { includeTime: true })}
              </p>
            )}

            {/* Error */}
            {isFailed && data.errorMessage && (
              <p className="text-xs text-red-500 dark:text-red-400 mb-2">
                {data.errorMessage}
              </p>
            )}

            {/* Needs update */}
            {needsUpdate && !isScheduled && (
              <div className="flex items-center gap-1.5 mb-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <span className="text-xs text-amber-700 dark:text-amber-400">수정 반영이 필요합니다</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-3">
              {data.wpPostUrl && (
                <a
                  href={data.wpPostUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  보기
                </a>
              )}
              {isPublished && (
                <Button
                  variant="outline"
                  onClick={() => onSiteUpdate(siteId)}
                  disabled={isUpdatingThis}
                  className="flex items-center gap-1.5 px-3 py-1.5 h-auto text-xs font-medium border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {isUpdatingThis ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  수정 반영
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(siteId)}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 h-auto text-xs font-medium text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                삭제
              </Button>
            </div>
          </motion.div>
        )
      })}

      {/* Publish history */}
      <WPPublishHistory publishHistory={publishHistory} getSiteName={getSiteName} />

      {/* Publish to another site button */}
      {unpublishedSites.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          <Button
            variant="outline"
            onClick={onPublishToAnother}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <Plus className="w-4 h-4" />
            다른 사이트에 발행
          </Button>
        </motion.div>
      )}

      {/* Delete confirmation modal */}
      <Dialog open={!!showDeleteModal} onOpenChange={(open) => { if (!open && !deleting) setShowDeleteModal(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>WordPress 글 삭제</DialogTitle>
            <DialogDescription>
              {showDeleteModal && (
                <>
                  <span className="font-medium">{getSiteName(showDeleteModal)}</span>에서 발행된 글을 삭제합니다.
                  <br />
                  <span className="text-xs">다른 사이트에 발행된 글에는 영향을 주지 않습니다.</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(null)} disabled={deleting}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (showDeleteModal) {
                  onSiteDelete(showDeleteModal)
                  setShowDeleteModal(null)
                }
              }}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {deleting ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
