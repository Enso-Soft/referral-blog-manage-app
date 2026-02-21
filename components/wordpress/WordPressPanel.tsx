'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  AlertCircle,
  Globe,
  ImageIcon,
  Settings,
  Check,
  X,
  Tag,
  ChevronUp,
  Calendar,
  MessageCircle,
} from 'lucide-react'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { normalizeWordPressData, type NormalizedWordPressData } from '@/lib/wordpress-api'
import { Button } from '@/components/ui/button'

import { WPPublishedCards } from '@/components/wordpress/WPPublishedCards'
import { WPCategoryTree } from '@/components/wordpress/WPCategoryTree'
import { WPPublishHistory } from '@/components/wordpress/WPPublishHistory'
import { WPPublishProgress } from '@/components/wordpress/WPPublishProgress'
import { WPConfirmModals } from '@/components/wordpress/WPConfirmModals'
import {
  extractImagesFromHtml,
  getDefaultSchedule,
  getTodayDateStr,
  extractDomain,
  getStoredSiteSelections,
  saveStoredSiteSelections,
  containerVariants,
  itemVariants,
  PUBLISH_STEPS,
  type WPSiteInfo,
  type PerSiteData,
  type SitePublishStatus,
  type WordPressPanelProps,
} from '@/components/wordpress/wp-helpers'

export function WordPressPanel({ postId, post }: WordPressPanelProps) {
  const router = useRouter()
  const { authFetch } = useAuthFetch()
  const [availableSites, setAvailableSites] = useState<WPSiteInfo[]>([])
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const [publishing, setPublishing] = useState(false)
  const [updatingSiteIds, setUpdatingSiteIds] = useState<Set<string>>(new Set())
  const [publishStatus, setPublishStatus] = useState<'draft' | 'publish' | 'future'>('publish')
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string | null>(null)
  const [removeFeaturedFromContent, setRemoveFeaturedFromContent] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [showPublishForm, setShowPublishForm] = useState(false)
  const [showOverwriteModal, setShowOverwriteModal] = useState(false)
  const [showNoCategoryModal, setShowNoCategoryModal] = useState(false)

  // Per-site data
  const [perSiteData, setPerSiteData] = useState<Record<string, PerSiteData>>({})
  const [activeCategoryTab, setActiveCategoryTab] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set())
  const toggleGroup = useCallback((catId: number) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }, [])

  // Multi-publish status
  const [publishingSiteStatus, setPublishingSiteStatus] = useState<Record<string, SitePublishStatus>>({})
  const [overwriteSiteIds, setOverwriteSiteIds] = useState<string[]>([])
  const [noCategorySiteIds, setNoCategorySiteIds] = useState<string[]>([])

  // Tags
  const [keywordTags, setKeywordTags] = useState<string[]>(post.keywords || [])
  const [newTagInput, setNewTagInput] = useState('')

  // Schedule
  const [schedule, setSchedule] = useState(getDefaultSchedule)

  // SEO
  const [seoOpen, setSeoOpen] = useState(false)
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [commentStatus, setCommentStatus] = useState<'open' | 'closed'>(() => {
    if (typeof window === 'undefined') return 'open'
    return (localStorage.getItem('wp-comment-status') as 'open' | 'closed') || 'open'
  })
  const [removeEmptyParagraphs, setRemoveEmptyParagraphs] = useState(() => {
    if (typeof window === 'undefined') return true
    const saved = localStorage.getItem('wp-remove-empty-paragraphs')
    return saved === null ? true : saved === 'true'
  })

  // Publish step
  const [publishStep, setPublishStep] = useState(0)

  // Refs
  const loadedSitesRef = useRef(new Set<string>())
  const perSiteDataRef = useRef(perSiteData)
  perSiteDataRef.current = perSiteData
  const selectedSiteIdsRef = useRef(selectedSiteIds)
  selectedSiteIdsRef.current = selectedSiteIds

  // Extract images from content
  const postImages = useMemo(() => extractImagesFromHtml(post.content || ''), [post.content])

  // Set first image as default featured image
  useEffect(() => {
    if (postImages.length > 0 && !featuredImageUrl) {
      setFeaturedImageUrl(postImages[0])
    }
  }, [postImages, featuredImageUrl])

  // Normalized WP data
  const normalizedWP: NormalizedWordPressData = useMemo(
    () => normalizeWordPressData(post.wordpress as Record<string, unknown> | undefined),
    [post.wordpress]
  )

  // Published sites
  const publishedSites = useMemo(() => {
    const entries = Object.entries(normalizedWP.sites)
      .filter(([, data]) => data.wpPostId && data.postStatus !== 'not_published')
      .map(([siteId, data]) => ({
        siteId,
        data,
        siteInfo: availableSites.find(s => s.id === siteId),
      }))
    const stored = getStoredSiteSelections()
    return entries.sort((a, b) => {
      const aTime = stored.lastSelectedAt[a.siteId] || 0
      const bTime = stored.lastSelectedAt[b.siteId] || 0
      if (bTime !== aTime) return bTime - aTime
      const aIdx = availableSites.findIndex(s => s.id === a.siteId)
      const bIdx = availableSites.findIndex(s => s.id === b.siteId)
      return aIdx - bIdx
    })
  }, [normalizedWP.sites, availableSites])

  // Unpublished sites
  const unpublishedSites = useMemo(() => {
    return availableSites.filter(
      s => !publishedSites.some(ps => ps.siteId === s.id)
    )
  }, [availableSites, publishedSites])

  const hasPublishedSites = publishedSites.length > 0
  const formSites = showPublishForm ? unpublishedSites : availableSites

  const sortedFormSites = useMemo(() => {
    const stored = getStoredSiteSelections()
    return [...formSites].sort((a, b) => {
      const aTime = stored.lastSelectedAt[a.id] || 0
      const bTime = stored.lastSelectedAt[b.id] || 0
      if (bTime !== aTime) return bTime - aTime
      const aIdx = availableSites.findIndex(s => s.id === a.id)
      const bIdx = availableSites.findIndex(s => s.id === b.id)
      return aIdx - bIdx
    })
  }, [formSites, availableSites])

  const selectedSites = useMemo(() => {
    return availableSites.filter(s => selectedSiteIds.includes(s.id))
  }, [availableSites, selectedSiteIds])

  const sortedSelectedSiteIds = useMemo(() => {
    return sortedFormSites
      .filter(s => selectedSiteIds.includes(s.id))
      .map(s => s.id)
  }, [sortedFormSites, selectedSiteIds])

  const anySiteLoading = useMemo(() => {
    return selectedSiteIds.some(id => perSiteData[id]?.loading)
  }, [selectedSiteIds, perSiteData])

  // Restore slug/excerpt from first published site
  useEffect(() => {
    const firstSiteData = publishedSites[0]?.data
    setSlug(firstSiteData?.slug || post.slug || '')
    setExcerpt(firstSiteData?.excerpt || post.excerpt || '')
    if (firstSiteData?.commentStatus && !localStorage.getItem('wp-comment-status')) setCommentStatus(firstSiteData.commentStatus)
  }, [publishedSites.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep activeCategoryTab in sync
  useEffect(() => {
    setActiveCategoryTab(prev => {
      if (sortedSelectedSiteIds.length === 0) return null
      if (prev && sortedSelectedSiteIds.includes(prev)) return prev
      return sortedSelectedSiteIds[0]
    })
  }, [sortedSelectedSiteIds])

  // Publish step timer
  useEffect(() => {
    if (!publishing) {
      setPublishStep(0)
      return
    }
    const timers = [
      setTimeout(() => setPublishStep(1), 2000),
      setTimeout(() => setPublishStep(2), 8000),
      setTimeout(() => setPublishStep(3), 15000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [publishing])

  // Load categories & tags for a specific site
  const loadCategoriesAndTagsForSite = useCallback(async (siteId: string) => {
    if (loadedSitesRef.current.has(siteId)) return
    loadedSitesRef.current.add(siteId)

    setPerSiteData(prev => ({
      ...prev,
      [siteId]: {
        categories: prev[siteId]?.categories || [],
        wpTags: prev[siteId]?.wpTags || [],
        selectedCategories: prev[siteId]?.selectedCategories || [],
        loading: true,
      },
    }))

    try {
      const [catRes, tagRes] = await Promise.allSettled([
        authFetch(`/api/wordpress/categories?wpSiteId=${siteId}`),
        authFetch(`/api/wordpress/tags?wpSiteId=${siteId}`),
      ])
      let cats: { id: number; name: string; parent: number }[] = []
      let tags: { id: number; name: string }[] = []
      if (catRes.status === 'fulfilled') {
        const catData = await catRes.value.json()
        if (catData.success) cats = catData.data
      }
      if (tagRes.status === 'fulfilled') {
        const tagData = await tagRes.value.json()
        if (tagData.success) tags = tagData.data
      }
      setPerSiteData(prev => ({
        ...prev,
        [siteId]: {
          categories: cats,
          wpTags: tags,
          selectedCategories: prev[siteId]?.selectedCategories || [],
          loading: false,
        },
      }))
    } catch {
      loadedSitesRef.current.delete(siteId)
      setPerSiteData(prev => ({
        ...prev,
        [siteId]: {
          categories: prev[siteId]?.categories || [],
          wpTags: prev[siteId]?.wpTags || [],
          selectedCategories: prev[siteId]?.selectedCategories || [],
          loading: false,
        },
      }))
    }
  }, [authFetch])

  // WP site list load + initial selection restore
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await authFetch('/api/settings/wordpress')
        const data = await res.json()
        if (data.success && data.data?.sites) {
          const sites = data.data.sites as WPSiteInfo[]
          setAvailableSites(sites)

          if (sites.length > 0) {
            const stored = getStoredSiteSelections()
            const validIds = stored.lastSelected.filter(id => sites.some(s => s.id === id))
            const initialIds = validIds.length > 0 ? validIds : [sites[0].id]
            setSelectedSiteIds(initialIds)

            for (const siteId of initialIds) {
              loadCategoriesAndTagsForSite(siteId)
            }

            if (hasPublishedSites) {
              try {
                await authFetch(`/api/wordpress/publish?postId=${postId}&sync=true`)
              } catch { /* sync failure ignored */ }
            }
          }
        }
      } catch {
        setAvailableSites([])
      } finally {
        setLoading(false)
      }
    }
    checkConnection()
  }, [authFetch]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle site toggle
  const handleSiteToggle = useCallback((siteId: string) => {
    const prev = selectedSiteIdsRef.current
    const isSelected = prev.includes(siteId)
    let next: string[]

    if (isSelected) {
      if (prev.length <= 1) return
      next = prev.filter(id => id !== siteId)
    } else {
      next = [...prev, siteId]
      loadCategoriesAndTagsForSite(siteId)
    }

    setSelectedSiteIds(next)
    saveStoredSiteSelections(next)
  }, [loadCategoriesAndTagsForSite])

  // Category toggle
  const handleCategoryToggle = useCallback((siteId: string, catId: number) => {
    setPerSiteData(prev => {
      const site = prev[siteId]
      if (!site) return prev
      const isSelected = site.selectedCategories.includes(catId)

      if (isSelected) {
        return {
          ...prev,
          [siteId]: {
            ...site,
            selectedCategories: site.selectedCategories.filter(id => id !== catId),
          },
        }
      }

      const next = new Set(site.selectedCategories)
      next.add(catId)
      let current = site.categories.find(c => c.id === catId)
      while (current && current.parent !== 0) {
        const parentCat = site.categories.find(c => c.id === current!.parent)
        if (!parentCat) break
        next.add(parentCat.id)
        current = parentCat
      }

      return {
        ...prev,
        [siteId]: { ...site, selectedCategories: Array.from(next) },
      }
    })
  }, [])

  // Resolve keyword tags for a specific site
  const resolveKeywordTagsForSite = useCallback(async (keywords: string[], siteId: string): Promise<number[]> => {
    if (!keywords.length) return []

    let siteTags = perSiteDataRef.current[siteId]?.wpTags || []
    if (siteTags.length === 0 && !perSiteDataRef.current[siteId]) {
      try {
        const res = await authFetch(`/api/wordpress/tags?wpSiteId=${siteId}`)
        const data = await res.json()
        if (data.success) siteTags = data.data
      } catch { /* ignored */ }
    }

    const resolvedIds: number[] = []
    const updatedTags = [...siteTags]

    for (const keyword of keywords) {
      const existing = updatedTags.find(t => t.name.toLowerCase() === keyword.toLowerCase())
      if (existing) {
        resolvedIds.push(existing.id)
        continue
      }
      try {
        const res = await authFetch('/api/wordpress/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: keyword, wpSiteId: siteId }),
        })
        const data = await res.json()
        if (data.success && data.data?.id) {
          resolvedIds.push(data.data.id)
          updatedTags.push({ id: data.data.id, name: data.data.name })
        }
      } catch { /* ignored */ }
    }

    setPerSiteData(prev => ({
      ...prev,
      [siteId]: {
        ...(prev[siteId] || { categories: [], selectedCategories: [], loading: false }),
        wpTags: updatedTags,
      },
    }))

    return resolvedIds
  }, [authFetch])

  // Multi-publish flow
  const doMultiPublish = useCallback(async () => {
    if (publishStatus === 'future') {
      const scheduled = new Date(`${schedule.date}T${schedule.time}`)
      if (isNaN(scheduled.getTime()) || scheduled.getTime() <= Date.now()) {
        setError('예약 시간이 현재 시간보다 이후여야 합니다.')
        return
      }
    }

    const siteIds = selectedSiteIdsRef.current
    setPublishing(true)
    setError('')

    const initialStatus: Record<string, SitePublishStatus> = {}
    for (const siteId of siteIds) {
      initialStatus[siteId] = { status: 'pending' }
    }
    setPublishingSiteStatus(initialStatus)

    const results = await Promise.allSettled(siteIds.map(async (siteId) => {
      setPublishingSiteStatus(prev => ({ ...prev, [siteId]: { ...prev[siteId], status: 'resolving_tags' } }))
      const tagIds = await resolveKeywordTagsForSite(keywordTags, siteId)

      setPublishingSiteStatus(prev => ({ ...prev, [siteId]: { ...prev[siteId], status: 'publishing' } }))

      const sitePerData = perSiteDataRef.current[siteId]
      const body: Record<string, unknown> = {
        postId,
        wpSiteId: siteId,
        status: publishStatus,
        featuredImageUrl: featuredImageUrl || undefined,
        removeFeaturedFromContent,
        removeEmptyParagraphs,
        categories: sitePerData?.selectedCategories?.length ? sitePerData.selectedCategories : undefined,
        tags: tagIds.length > 0 ? tagIds : undefined,
        slug: slug || undefined,
        excerpt: excerpt || undefined,
        commentStatus,
      }

      if (publishStatus === 'future') {
        body.date = new Date(`${schedule.date}T${schedule.time}`).toISOString()
      }

      const res = await authFetch('/api/wordpress/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (data.success) {
        setPublishingSiteStatus(prev => ({
          ...prev,
          [siteId]: {
            status: 'success',
            wpPostId: data.data.wpPostId,
            wpPostUrl: data.data.wpPostUrl,
            postStatus: data.data.postStatus,
          },
        }))
      } else {
        throw new Error(data.error || '발행에 실패했습니다.')
      }
    }))

    const failedIndices: number[] = []
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        failedIndices.push(i)
        const siteId = siteIds[i]
        setPublishingSiteStatus(prev => ({
          ...prev,
          [siteId]: {
            ...prev[siteId],
            status: 'failed',
            error: result.reason?.message || '발행에 실패했습니다.',
          },
        }))
      }
    })

    if (failedIndices.length === 0) {
      setShowPublishForm(false)
    } else if (failedIndices.length < siteIds.length) {
      setError(`${siteIds.length}개 중 ${failedIndices.length}개 사이트에 발행이 실패했습니다.`)
    } else {
      setError('모든 사이트에 발행이 실패했습니다.')
    }

    setPublishing(false)
  }, [postId, publishStatus, featuredImageUrl, removeFeaturedFromContent, removeEmptyParagraphs, keywordTags, resolveKeywordTagsForSite, slug, excerpt, commentStatus, schedule, authFetch])

  const proceedMultiPublish = useCallback(async () => {
    const siteIds = selectedSiteIdsRef.current
    const sitesToOverwrite: string[] = []

    await Promise.allSettled(siteIds.map(async (siteId) => {
      const existingSiteData = normalizedWP.sites[siteId]
      const existingWpPostId = existingSiteData?.wpPostId
      if (existingWpPostId) {
        try {
          const res = await authFetch(`/api/wordpress/publish?wpPostId=${existingWpPostId}&wpSiteId=${siteId}`)
          const data = await res.json()
          if (data.success && data.data.exists) {
            sitesToOverwrite.push(siteId)
          }
        } catch { /* check failure → proceed */ }
      }
    }))

    if (sitesToOverwrite.length > 0) {
      setOverwriteSiteIds(sitesToOverwrite)
      setShowOverwriteModal(true)
      return
    }

    doMultiPublish()
  }, [normalizedWP.sites, authFetch, doMultiPublish])

  const handlePublish = useCallback(() => {
    const sitesWithUnselectedCats = selectedSiteIdsRef.current.filter(siteId => {
      const data = perSiteDataRef.current[siteId]
      return data && data.categories.length > 0 && data.selectedCategories.length === 0
    })

    if (sitesWithUnselectedCats.length > 0) {
      setNoCategorySiteIds(sitesWithUnselectedCats)
      setShowNoCategoryModal(true)
      return
    }

    proceedMultiPublish()
  }, [proceedMultiPublish])

  // Per-site update
  const handleSiteUpdate = useCallback(async (siteId: string) => {
    setUpdatingSiteIds(prev => new Set(prev).add(siteId))
    setError('')
    try {
      const siteData = normalizedWP.sites[siteId]
      const tagIds = await resolveKeywordTagsForSite(keywordTags, siteId)

      const body: Record<string, unknown> = {
        postId,
        wpSiteId: siteId,
        status: 'publish',
        featuredImageUrl: featuredImageUrl || undefined,
        removeFeaturedFromContent,
        removeEmptyParagraphs,
        categories: siteData?.categories?.length ? siteData.categories : (perSiteDataRef.current[siteId]?.selectedCategories?.length ? perSiteDataRef.current[siteId].selectedCategories : undefined),
        tags: tagIds.length > 0 ? tagIds : undefined,
        slug: siteData?.slug || slug || undefined,
        excerpt: siteData?.excerpt || excerpt || undefined,
        commentStatus,
      }

      const res = await authFetch('/api/wordpress/publish', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || '업데이트에 실패했습니다.')
      }
    } catch {
      setError('업데이트에 실패했습니다.')
    } finally {
      setUpdatingSiteIds(prev => { const next = new Set(prev); next.delete(siteId); return next })
    }
  }, [postId, normalizedWP.sites, featuredImageUrl, removeFeaturedFromContent, removeEmptyParagraphs, keywordTags, resolveKeywordTagsForSite, slug, excerpt, commentStatus, authFetch])

  // Per-site delete
  const handleSiteDelete = useCallback(async (siteId: string) => {
    setDeleting(true)
    setError('')
    try {
      const res = await authFetch('/api/wordpress/publish', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, wpSiteId: siteId }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || '삭제에 실패했습니다.')
      }
    } catch {
      setError('삭제에 실패했습니다.')
    } finally {
      setDeleting(false)
    }
  }, [postId, authFetch])

  // Publish history
  const publishHistory = useMemo(() => {
    return [...normalizedWP.publishHistory].reverse()
  }, [normalizedWP.publishHistory])

  // Publish step message
  const currentPublishMessage = useMemo(() => {
    if (!publishing) return ''
    if (publishStep === 0 && keywordTags.length > 0) return PUBLISH_STEPS[0].message
    if (publishStep === 0) return PUBLISH_STEPS[1].message
    if (publishStep === 1 && postImages.length > 0) return PUBLISH_STEPS[1].message
    if (publishStep === 1) return PUBLISH_STEPS[2].message
    if (publishStep === 2) return PUBLISH_STEPS[2].message
    return PUBLISH_STEPS[3].message
  }, [publishing, publishStep, keywordTags.length, postImages.length])

  // Site name helper
  const getSiteName = useCallback((siteId?: string, siteUrl?: string) => {
    if (siteId) {
      const site = availableSites.find(s => s.id === siteId)
      if (site) return site.displayName || extractDomain(site.siteUrl)
    }
    if (siteUrl) return extractDomain(siteUrl)
    return '알 수 없는 사이트'
  }, [availableSites])

  // ─── Render ──────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (availableSites.length === 0) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-center py-8">
          <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            WordPress가 연결되어 있지 않습니다.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
            설정 페이지에서 WordPress 사이트를 연결해주세요.
          </p>
          <Button
            onClick={() => router.push('/settings')}
            className="inline-flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100"
          >
            <Settings className="w-4 h-4" />
            설정으로 이동
          </Button>
        </div>
      </div>
    )
  }

  // ─── Card view (published sites exist, not in publish form) ───
  if (hasPublishedSites && !showPublishForm) {
    return (
      <WPPublishedCards
        publishedSites={publishedSites}
        unpublishedSites={unpublishedSites}
        normalizedWP={normalizedWP}
        postUpdatedAt={post.updatedAt}
        error={error}
        updatingSiteIds={updatingSiteIds}
        deleting={deleting}
        getSiteName={getSiteName}
        onSiteUpdate={handleSiteUpdate}
        onSiteDelete={handleSiteDelete}
        onPublishToAnother={() => {
          setShowPublishForm(true)
          const stored = getStoredSiteSelections()
          const validUnpublished = stored.lastSelected.filter(id => unpublishedSites.some(s => s.id === id))
          const initialIds = validUnpublished.length > 0 ? validUnpublished : [unpublishedSites[0].id]
          setSelectedSiteIds(initialIds)
          for (const id of initialIds) {
            loadCategoriesAndTagsForSite(id)
          }
          setError('')
        }}
      />
    )
  }

  // ─── Publish form ───────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full">
      <motion.div
        className="flex-1 p-6 space-y-5"
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >

      {/* Back button */}
      {showPublishForm && hasPublishedSites && (
        <motion.div variants={itemVariants}>
          <Button
            variant="ghost"
            onClick={() => { setShowPublishForm(false); setError('') }}
            className="flex items-center gap-1.5 h-auto p-0 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-transparent"
          >
            <ChevronUp className="w-4 h-4 rotate-[-90deg]" />
            발행 목록으로 돌아가기
          </Button>
        </motion.div>
      )}

      {/* Site selection grid */}
      <motion.div variants={itemVariants}>
        {sortedFormSites.length > 1 ? (
          <div>
            <div className="overflow-x-auto -mx-6 px-6 pt-1 scrollbar-hide">
              <div className="grid grid-rows-2 grid-flow-col auto-cols-max gap-2 pb-1">
                {sortedFormSites.map((site) => {
                  const isSelected = selectedSiteIds.includes(site.id)
                  const host = extractDomain(site.siteUrl)
                  const displayName = site.displayName || host
                  return (
                    <Button
                      key={site.id}
                      variant="outline"
                      onClick={() => handleSiteToggle(site.id)}
                      className={`flex items-center gap-2 px-3 py-2 h-auto text-sm rounded-lg transition-all whitespace-nowrap
                        ${isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                    >
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 flex-shrink-0 text-blue-500" />
                      ) : (
                        <Globe className={`w-3.5 h-3.5 flex-shrink-0 text-gray-400`} />
                      )}
                      <span className="font-medium">{displayName}</span>
                      {site.displayName && (
                        <span className={`text-xs ${isSelected ? 'text-blue-400 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                          {host}
                        </span>
                      )}
                    </Button>
                  )
                })}
              </div>
            </div>
            {selectedSiteIds.length >= 2 && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">
                {selectedSiteIds.length}개 사이트 선택됨
              </p>
            )}
          </div>
        ) : selectedSites.length > 0 ? (
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Globe className="w-4 h-4 text-gray-500" />
            <div className="text-sm">
              <span className="text-gray-500 dark:text-gray-400">연결:</span>{' '}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {selectedSites[0].displayName || selectedSites[0].siteUrl}
              </span>
            </div>
          </div>
        ) : null}
      </motion.div>

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

      {/* Publish status */}
      <motion.div variants={itemVariants}>
        <Label className="block text-sm font-medium mb-2">발행 상태</Label>
        <div className="flex gap-3">
          {(['publish', 'draft', 'future'] as const).map(value => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="wp-status"
                value={value}
                checked={publishStatus === value}
                onChange={(e) => setPublishStatus(e.target.value as 'draft' | 'publish' | 'future')}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {value === 'publish' ? '공개 발행' : value === 'draft' ? '임시 저장' : '예약 발행'}
              </span>
            </label>
          ))}
        </div>
      </motion.div>

      {/* Schedule date */}
      {publishStatus === 'future' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Label className="block text-sm font-medium mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            예약 일시
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={schedule.date}
              min={getTodayDateStr()}
              onChange={(e) => { setSchedule(s => ({ ...s, date: e.target.value })); setError('') }}
              className="flex-1"
            />
            <Input
              type="time"
              value={schedule.time}
              onChange={(e) => { setSchedule(s => ({ ...s, time: e.target.value })); setError('') }}
            />
          </div>
          {schedule.date && schedule.time && new Date(`${schedule.date}T${schedule.time}`).getTime() <= Date.now() && (
            <p className="text-xs text-red-500 mt-1.5">현재 시간보다 이후의 시간을 선택해주세요.</p>
          )}
        </motion.div>
      )}

      {/* Categories */}
      <WPCategoryTree
        selectedSiteIds={selectedSiteIds}
        sortedSelectedSiteIds={sortedSelectedSiteIds}
        perSiteData={perSiteData}
        activeCategoryTab={activeCategoryTab}
        collapsedGroups={collapsedGroups}
        anySiteLoading={anySiteLoading}
        getSiteName={getSiteName}
        onActiveCategoryTabChange={setActiveCategoryTab}
        onCategoryToggle={handleCategoryToggle}
        onToggleGroup={toggleGroup}
      />

      {anySiteLoading && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          카테고리/태그 불러오는 중...
        </div>
      )}

      {/* Featured image selection */}
      {postImages.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-1.5 mb-2">
            <ImageIcon className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">대표 이미지</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {postImages.map((url, i) => (
              <Button
                key={i}
                variant="ghost"
                type="button"
                onClick={() => setFeaturedImageUrl(url)}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all h-auto p-0 ${
                  featuredImageUrl === url
                    ? 'border-blue-500 ring-2 ring-blue-500/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`이미지 ${i + 1}`} className="w-full h-full object-cover" />
                {featuredImageUrl === url && (
                  <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </Button>
            ))}
          </div>
          <label className="flex items-center gap-2 mt-3 cursor-pointer">
            <input
              type="checkbox"
              checked={removeFeaturedFromContent}
              onChange={(e) => setRemoveFeaturedFromContent(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">대표 이미지를 본문에서 제거</span>
          </label>
          <p className="ml-6 text-xs text-gray-400 dark:text-gray-500">
            해제 시 WordPress 테마 설정에 따라 대표 이미지가 본문에 중복으로 표시될 수 있습니다.
          </p>
        </motion.div>
      )}

      {/* Tags */}
      <motion.div variants={itemVariants}>
        <Label className="block text-sm font-medium mb-2">
          <Tag className="w-4 h-4 inline mr-1" />
          태그
        </Label>
        {keywordTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {keywordTags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full"
              >
                {tag}
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => setKeywordTags((prev) => prev.filter((_, j) => j !== i))}
                  className="ml-0.5 h-auto w-auto p-0 hover:text-indigo-900 dark:hover:text-indigo-100 hover:bg-transparent"
                >
                  <X className="w-3 h-3" />
                </Button>
              </span>
            ))}
          </div>
        )}
        <Input
          type="text"
          value={newTagInput}
          onChange={(e) => setNewTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newTagInput.trim()) {
              e.preventDefault()
              const value = newTagInput.trim()
              if (!keywordTags.some((t) => t.toLowerCase() === value.toLowerCase())) {
                setKeywordTags((prev) => [...prev, value])
              }
              setNewTagInput('')
            }
          }}
          placeholder="태그 입력 후 Enter..."
        />
        <p className="text-xs text-gray-400 mt-1">발행 시 WordPress 태그로 자동 생성됩니다.</p>
      </motion.div>

      {/* SEO options */}
      <motion.div variants={itemVariants} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <Button
          variant="ghost"
          onClick={() => setSeoOpen(!seoOpen)}
          className="w-full flex items-center justify-between p-3 h-auto rounded-none hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">SEO 옵션</span>
          <ChevronUp className={`w-4 h-4 text-gray-500 transition-transform ${seoOpen ? '' : 'rotate-180'}`} />
        </Button>
        {seoOpen && (
          <div className="px-3 pb-3 space-y-3">
            <div>
              <Label className="block text-xs font-medium mb-1">슬러그 (URL)</Label>
              <Input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-post-slug" />
              <p className="text-xs text-gray-400 mt-0.5">비워두면 WordPress가 자동 생성합니다.</p>
            </div>
            <div>
              <Label className="block text-xs font-medium mb-1">요약 (Excerpt)</Label>
              <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="글 요약을 입력하세요..." rows={3} className="resize-none" />
            </div>
          </div>
        )}
      </motion.div>

      {/* Comment setting */}
      <motion.div variants={itemVariants} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-gray-500" />
          <Label htmlFor="comment-status" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">댓글 허용</Label>
        </div>
        <Switch
          id="comment-status"
          checked={commentStatus === 'open'}
          onCheckedChange={(checked) => {
            const next = checked ? 'open' : 'closed'
            setCommentStatus(next)
            localStorage.setItem('wp-comment-status', next)
          }}
        />
      </motion.div>

      {/* Empty paragraph removal */}
      <motion.div variants={itemVariants} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex items-center justify-between">
          <Label htmlFor="remove-empty" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">빈 줄 제거</Label>
          <Switch
            id="remove-empty"
            checked={removeEmptyParagraphs}
            onCheckedChange={(checked) => {
              setRemoveEmptyParagraphs(checked)
              localStorage.setItem('wp-remove-empty', String(checked))
            }}
          />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 leading-relaxed">
          WordPress 테마의 단락 하단 여백과 원본의 빈 줄이 합쳐지면 행간이 과도하게 벌어질 수 있습니다. 켜두면 발행 시 빈 줄을 자동 제거합니다.
        </p>
      </motion.div>

      {/* Publish history */}
      <WPPublishHistory publishHistory={publishHistory} getSiteName={getSiteName} animated />

      </motion.div>

      {/* Publish button */}
      <WPPublishProgress
        publishing={publishing}
        selectedSiteIds={selectedSiteIds}
        sortedSelectedSiteIds={sortedSelectedSiteIds}
        publishingSiteStatus={publishingSiteStatus}
        publishStatus={publishStatus}
        currentPublishMessage={currentPublishMessage}
        getSiteName={getSiteName}
        onPublish={handlePublish}
      />

      {/* Confirmation modals */}
      <WPConfirmModals
        showOverwriteModal={showOverwriteModal}
        overwriteSiteIds={overwriteSiteIds}
        showNoCategoryModal={showNoCategoryModal}
        noCategorySiteIds={noCategorySiteIds}
        getSiteName={getSiteName}
        onOverwriteClose={() => setShowOverwriteModal(false)}
        onOverwriteConfirm={() => { setShowOverwriteModal(false); doMultiPublish() }}
        onNoCategoryClose={() => setShowNoCategoryModal(false)}
        onNoCategoryConfirm={() => { setShowNoCategoryModal(false); proceedMultiPublish() }}
      />
    </div>
  )
}
