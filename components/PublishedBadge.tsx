'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { normalizeWordPressData } from '@/lib/wordpress-api'
import { getFaviconUrl } from '@/lib/url-utils'
import { cn } from '@/lib/utils'

interface PublishedSiteInfo {
  key: string
  favicon: string | null
}

interface PublishedBadgeProps {
  wordpress?: Record<string, unknown>
  publishedUrls?: string[]
  publishedUrl?: string
  className?: string
  /** Cycle interval in ms (default: 3000) */
  interval?: number
}

export function PublishedBadge({ wordpress, publishedUrls, publishedUrl, className, interval = 3000 }: PublishedBadgeProps) {
  const sites = useMemo<PublishedSiteInfo[]>(() => {
    const normalized = normalizeWordPressData(wordpress as Record<string, unknown> | undefined)
    const wpSites = Object.entries(normalized.sites)
      .filter(([, data]) => data.wpPostId && data.wpPostUrl && data.postStatus !== 'not_published' && data.postStatus !== 'failed')
      .map(([siteId, data]) => ({
        key: siteId,
        favicon: getFaviconUrl(data.wpPostUrl!),
      }))

    // WP URL set for dedup
    const wpUrls = new Set(
      Object.values(normalized.sites)
        .map(d => d.wpPostUrl)
        .filter(Boolean)
    )

    // Merge manual URLs: publishedUrls (array) > publishedUrl (legacy single)
    const result = [...wpSites]
    const allManualUrls = publishedUrls?.length ? publishedUrls : (publishedUrl ? [publishedUrl] : [])
    for (const url of allManualUrls) {
      if (url && !wpUrls.has(url)) {
        result.push({ key: url, favicon: getFaviconUrl(url) })
      }
    }

    // Fallback: no WP sites, try legacy publishedUrl
    if (result.length === 0 && publishedUrl) {
      return [{ key: '__manual__', favicon: getFaviconUrl(publishedUrl) }]
    }

    return result
  }, [wordpress, publishedUrls, publishedUrl])

  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (sites.length <= 1) return
    const timer = setInterval(() => {
      setIdx(prev => (prev + 1) % sites.length)
    }, interval)
    return () => clearInterval(timer)
  }, [sites.length, interval])

  useEffect(() => {
    setIdx(0)
  }, [sites.length])

  const total = sites.length
  const current = sites[idx % total] || sites[0]

  if (!current) {
    return <span className={className}>발행됨</span>
  }

  if (total === 1) {
    return (
      <span className={cn('flex items-center gap-1.5', className)}>
        {current.favicon && (
          <img
            src={current.favicon}
            alt=""
            className="w-3.5 h-3.5 rounded-sm bg-white"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        )}
        발행됨
      </span>
    )
  }

  // Grid overlay: ghost and animated content share the same cell
  return (
    <span className={cn('inline-grid overflow-hidden', className)}>
      {/* Ghost: invisible, holds width stable */}
      <span className="col-start-1 row-start-1 flex items-center gap-1.5 invisible" aria-hidden>
        <span className="w-3.5 h-3.5 flex-shrink-0" />
        <span>발행됨</span>
        <span className="text-[10px]">{total}/{total}</span>
      </span>
      {/* Animated content in same cell */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={idx}
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -14, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="col-start-1 row-start-1 flex items-center gap-1.5"
        >
          {current.favicon && (
            <img
              src={current.favicon}
              alt=""
              className="w-3.5 h-3.5 rounded-sm bg-white"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          )}
          <span>발행됨</span>
          <span className="opacity-70 text-[10px]">{idx + 1}/{total}</span>
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
