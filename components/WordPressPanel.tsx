'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Globe,
  ImageIcon,
  Settings,
  Check,
  Trash2,
  X,
  Tag,
  ChevronDown,
  ChevronUp,
  Clock,
  RefreshCw,
  Calendar,
  History,
  MessageCircle,
  Plus,
} from 'lucide-react'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import { formatDate } from '@/lib/utils'
import { normalizeWordPressData, type NormalizedWordPressData } from '@/lib/wordpress-api'
import type { WPPublishHistoryEntry, WPSitePublishData } from '@/lib/schemas'

function extractImagesFromHtml(content: string): string[] {
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/g
  const images: string[] = []
  let match
  while ((match = imgRegex.exec(content)) !== null) {
    images.push(match[1])
  }
  return images
}

function padTwo(n: number): string {
  return String(n).padStart(2, '0')
}

function getDefaultSchedule() {
  const d = new Date()
  d.setHours(d.getHours() + 1, 0, 0, 0)
  return {
    date: `${d.getFullYear()}-${padTwo(d.getMonth() + 1)}-${padTwo(d.getDate())}`,
    time: `${padTwo(d.getHours())}:00`,
  }
}

function getTodayDateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${padTwo(d.getMonth() + 1)}-${padTwo(d.getDate())}`
}

function timestampToMs(ts: unknown): number {
  if (!ts) return 0
  if (ts instanceof Date) return ts.getTime()
  if (typeof ts === 'object' && ts !== null) {
    const obj = ts as Record<string, unknown>
    if ('toDate' in obj && typeof obj.toDate === 'function') return (obj as { toDate: () => Date }).toDate().getTime()
    if (typeof obj._seconds === 'number') return obj._seconds * 1000
    if (typeof obj.seconds === 'number') return (obj.seconds as number) * 1000
  }
  return 0
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

// --- Category tree helpers ---
interface CategoryNode {
  id: number
  name: string
  parent: number
  children: CategoryNode[]
}

function buildCategoryTree(categories: { id: number; name: string; parent: number }[]): CategoryNode[] {
  const nodes = new Map<number, CategoryNode>()
  for (const cat of categories) {
    nodes.set(cat.id, { id: cat.id, name: cat.name, parent: cat.parent, children: [] })
  }
  const roots: CategoryNode[] = []
  for (const cat of categories) {
    const node = nodes.get(cat.id)!
    if (cat.parent === 0 || !nodes.has(cat.parent)) {
      roots.push(node)
    } else {
      nodes.get(cat.parent)!.children.push(node)
    }
  }
  return roots
}

// --- localStorage helpers ---
interface WPSiteSelections {
  lastSelected: string[]
  lastSelectedAt: Record<string, number>
}

function getStoredSiteSelections(): WPSiteSelections {
  if (typeof window === 'undefined') return { lastSelected: [], lastSelectedAt: {} }
  try {
    const raw = localStorage.getItem('wp-site-selections')
    if (!raw) return { lastSelected: [], lastSelectedAt: {} }
    return JSON.parse(raw)
  } catch {
    return { lastSelected: [], lastSelectedAt: {} }
  }
}

function saveStoredSiteSelections(siteIds: string[]) {
  const prev = getStoredSiteSelections()
  const now = Date.now()
  const lastSelectedAt = { ...prev.lastSelectedAt }
  for (const id of siteIds) {
    lastSelectedAt[id] = now
  }
  localStorage.setItem('wp-site-selections', JSON.stringify({
    lastSelected: siteIds,
    lastSelectedAt,
  }))
}

// --- Interfaces ---
interface PerSiteData {
  categories: { id: number; name: string; parent: number }[]
  wpTags: { id: number; name: string }[]
  selectedCategories: number[]
  loading: boolean
}

interface SitePublishStatus {
  status: 'pending' | 'resolving_tags' | 'publishing' | 'success' | 'failed'
  wpPostId?: number
  wpPostUrl?: string
  postStatus?: string
  error?: string
}

// Stagger animation variants
const containerVariants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

// Publish step messages (single-site progress)
const PUBLISH_STEPS = [
  { key: 'tags', message: '태그 생성 중...' },
  { key: 'images', message: '이미지를 WordPress로 업로드 중...' },
  { key: 'publish', message: '글을 발행하는 중...' },
  { key: 'almost', message: '거의 완료되었습니다...' },
]

interface WordPressPanelProps {
  postId: string
  post: {
    title: string
    content: string
    keywords?: string[]
    updatedAt?: unknown
    slug?: string
    excerpt?: string
    wordpress?: Record<string, unknown>
  }
}

export function WordPressPanel({ postId, post }: WordPressPanelProps) {
  const router = useRouter()
  const { authFetch } = useAuthFetch()
  const [availableSites, setAvailableSites] = useState<{ id: string; siteUrl: string; displayName: string | null }[]>([])
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const [publishing, setPublishing] = useState(false)
  const [updatingSiteIds, setUpdatingSiteIds] = useState<Set<string>>(new Set())
  const [publishStatus, setPublishStatus] = useState<'draft' | 'publish' | 'future'>('publish')
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string | null>(null)
  const [removeFeaturedFromContent, setRemoveFeaturedFromContent] = useState(true)
  const [error, setError] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showPublishForm, setShowPublishForm] = useState(false)
  const [showOverwriteModal, setShowOverwriteModal] = useState(false)
  const [showNoCategoryModal, setShowNoCategoryModal] = useState(false)

  // Per-site data (categories, tags, selectedCategories)
  const [perSiteData, setPerSiteData] = useState<Record<string, PerSiteData>>({})
  const [activeCategoryTab, setActiveCategoryTab] = useState<string | null>(null)

  // Category group collapse state
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
  // Comments (localStorage)
  const [commentStatus, setCommentStatus] = useState<'open' | 'closed'>(() => {
    if (typeof window === 'undefined') return 'open'
    return (localStorage.getItem('wp-comment-status') as 'open' | 'closed') || 'open'
  })
  // Empty paragraph removal (localStorage, default true)
  const [removeEmptyParagraphs, setRemoveEmptyParagraphs] = useState(() => {
    if (typeof window === 'undefined') return true
    const saved = localStorage.getItem('wp-remove-empty-paragraphs')
    return saved === null ? true : saved === 'true'
  })

  // Publish step (single-site progress)
  const [publishStep, setPublishStep] = useState(0)

  // Comment & empty-paragraph settings → localStorage
  const handleCommentStatusToggle = useCallback(() => {
    const next = commentStatus === 'open' ? 'closed' : 'open'
    setCommentStatus(next)
    localStorage.setItem('wp-comment-status', next)
  }, [commentStatus])

  const handleRemoveEmptyToggle = useCallback(() => {
    const next = !removeEmptyParagraphs
    setRemoveEmptyParagraphs(next)
    localStorage.setItem('wp-remove-empty-paragraphs', String(next))
  }, [removeEmptyParagraphs])

  // History
  const [historyOpen, setHistoryOpen] = useState(false)

  // Refs for avoiding stale closures
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

  // Published sites (sorted by availableSites order for consistency with grid)
  const publishedSites = useMemo(() => {
    const entries = Object.entries(normalizedWP.sites)
      .filter(([, data]) => data.wpPostId && data.postStatus !== 'not_published')
      .map(([siteId, data]) => ({
        siteId,
        data,
        siteInfo: availableSites.find(s => s.id === siteId),
      }))
    // Sort by same logic as sortedFormSites: lastSelectedAt desc, then availableSites index as tiebreaker
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

  // formSites: when showPublishForm from card view → only unpublished; otherwise all
  const formSites = showPublishForm ? unpublishedSites : availableSites

  // Sorted form sites by last selected time (most recent first), availableSites index as tiebreaker
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

  // Selected sites info
  const selectedSites = useMemo(() => {
    return availableSites.filter(s => selectedSiteIds.includes(s.id))
  }, [availableSites, selectedSiteIds])

  // Sorted selected site IDs (derived from site grid order for consistency)
  const sortedSelectedSiteIds = useMemo(() => {
    return sortedFormSites
      .filter(s => selectedSiteIds.includes(s.id))
      .map(s => s.id)
  }, [sortedFormSites, selectedSiteIds])

  // Any selected site still loading categories?
  const anySiteLoading = useMemo(() => {
    return selectedSiteIds.some(id => perSiteData[id]?.loading)
  }, [selectedSiteIds, perSiteData])

  // Restore slug/excerpt/comment from first published site
  useEffect(() => {
    const firstSiteData = publishedSites[0]?.data
    setSlug(firstSiteData?.slug || post.slug || '')
    setExcerpt(firstSiteData?.excerpt || post.excerpt || '')
    if (firstSiteData?.commentStatus && !localStorage.getItem('wp-comment-status')) setCommentStatus(firstSiteData.commentStatus)
  }, [publishedSites.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep activeCategoryTab in sync with selectedSiteIds
  useEffect(() => {
    setActiveCategoryTab(prev => {
      if (sortedSelectedSiteIds.length === 0) return null
      if (prev && sortedSelectedSiteIds.includes(prev)) return prev
      return sortedSelectedSiteIds[0]
    })
  }, [sortedSelectedSiteIds])

  // Publish step timer (single-site progress)
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

  // Load categories & tags for a specific site (with caching)
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
      loadedSitesRef.current.delete(siteId) // allow retry on error
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
          const sites = data.data.sites as { id: string; siteUrl: string; displayName: string | null }[]
          setAvailableSites(sites)

          if (sites.length > 0) {
            // Restore from localStorage
            const stored = getStoredSiteSelections()
            const validIds = stored.lastSelected.filter(id => sites.some(s => s.id === id))
            const initialIds = validIds.length > 0 ? validIds : [sites[0].id]
            setSelectedSiteIds(initialIds)

            // Load categories/tags for selected sites
            for (const siteId of initialIds) {
              loadCategoriesAndTagsForSite(siteId)
            }

            // WP post sync
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

  // Handle site toggle (multi-select)
  const handleSiteToggle = useCallback((siteId: string) => {
    const prev = selectedSiteIdsRef.current
    const isSelected = prev.includes(siteId)
    let next: string[]

    if (isSelected) {
      if (prev.length <= 1) return // can't deselect last one
      next = prev.filter(id => id !== siteId)
    } else {
      next = [...prev, siteId]
      loadCategoriesAndTagsForSite(siteId)
    }

    setSelectedSiteIds(next)
    saveStoredSiteSelections(next)
  }, [loadCategoriesAndTagsForSite])

  // Category toggle (per-site)
  const handleCategoryToggle = useCallback((siteId: string, catId: number) => {
    setPerSiteData(prev => {
      const site = prev[siteId]
      if (!site) return prev
      const isSelected = site.selectedCategories.includes(catId)

      if (isSelected) {
        // Deselect: only this category, children unchanged
        return {
          ...prev,
          [siteId]: {
            ...site,
            selectedCategories: site.selectedCategories.filter(id => id !== catId),
          },
        }
      }

      // Select: also select all ancestor categories
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

    // Update perSiteData with new tags
    setPerSiteData(prev => ({
      ...prev,
      [siteId]: {
        ...(prev[siteId] || { categories: [], selectedCategories: [], loading: false }),
        wpTags: updatedTags,
      },
    }))

    return resolvedIds
  }, [authFetch])

  // --- Multi-publish flow ---
  const doMultiPublish = useCallback(async () => {
    // Validate schedule
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

    // Initialize per-site status
    const initialStatus: Record<string, SitePublishStatus> = {}
    for (const siteId of siteIds) {
      initialStatus[siteId] = { status: 'pending' }
    }
    setPublishingSiteStatus(initialStatus)

    const results = await Promise.allSettled(siteIds.map(async (siteId) => {
      // Resolve tags
      setPublishingSiteStatus(prev => ({ ...prev, [siteId]: { ...prev[siteId], status: 'resolving_tags' } }))
      const tagIds = await resolveKeywordTagsForSite(keywordTags, siteId)

      // Publish
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

    // Handle failures
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
    // Check each selected site for existing WP posts
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
    // Check each selected site: if it has categories but none selected
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

  // Per-site update (from card view)
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
      setShowDeleteModal(null)
    }
  }, [postId, authFetch])

  // Publish history (reverse)
  const publishHistory = useMemo(() => {
    return [...normalizedWP.publishHistory].reverse()
  }, [normalizedWP.publishHistory])

  // Single-site publish step message
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

  // WP not connected
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
          <button
            onClick={() => router.push('/settings')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium
                       bg-gray-900 dark:bg-white text-white dark:text-gray-900
                       rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            <Settings className="w-4 h-4" />
            설정으로 이동
          </button>
        </div>
      </div>
    )
  }

  // ─── Card view (published sites exist, not in publish form) ───
  if (hasPublishedSites && !showPublishForm) {
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
          const needsUpdate = isPublished && data.lastSyncedAt && post.updatedAt
            ? timestampToMs(post.updatedAt) > timestampToMs(data.lastSyncedAt)
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
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                               bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    보기
                  </a>
                )}
                {isPublished && (
                  <button
                    onClick={() => handleSiteUpdate(siteId)}
                    disabled={isUpdatingThis}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                               border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
                               rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
                               disabled:opacity-50"
                  >
                    {isUpdatingThis ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    수정 반영
                  </button>
                )}
                <button
                  onClick={() => setShowDeleteModal(siteId)}
                  disabled={deleting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                             text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800
                             rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors
                             disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  삭제
                </button>
              </div>
            </motion.div>
          )
        })}

        {/* Publish history */}
        {publishHistory.length > 0 && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
            </button>
            {historyOpen && (
              <div className="px-3 pb-3 space-y-2">
                {publishHistory.map((entry, i) => {
                  const actionLabels: Record<string, { label: string; color: string }> = {
                    published: { label: '발행', color: 'text-green-600 dark:text-green-400' },
                    updated: { label: '업데이트', color: 'text-blue-600 dark:text-blue-400' },
                    deleted: { label: '삭제', color: 'text-red-600 dark:text-red-400' },
                    scheduled: { label: '예약', color: 'text-purple-600 dark:text-purple-400' },
                  }
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
          </div>
        )}

        {/* Publish to another site button */}
        {unpublishedSites.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            onClick={() => {
              setShowPublishForm(true)
              // Restore selection from localStorage, filtered to unpublished
              const stored = getStoredSiteSelections()
              const validUnpublished = stored.lastSelected.filter(id => unpublishedSites.some(s => s.id === id))
              const initialIds = validUnpublished.length > 0 ? validUnpublished : [unpublishedSites[0].id]
              setSelectedSiteIds(initialIds)
              for (const id of initialIds) {
                loadCategoriesAndTagsForSite(id)
              }
              setError('')
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium
                       border border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400
                       rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            다른 사이트에 발행
          </motion.button>
        )}

        {/* Delete confirmation modal */}
        <AnimatePresence>
          {showDeleteModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-black/50"
                onClick={() => !deleting && setShowDeleteModal(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="relative w-full max-w-sm mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6"
              >
                <button
                  onClick={() => setShowDeleteModal(null)}
                  disabled={deleting}
                  className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    WordPress 글 삭제
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <span className="font-medium">{getSiteName(showDeleteModal)}</span>에서 발행된 글을 삭제합니다.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-5">
                  다른 사이트에 발행된 글에는 영향을 주지 않습니다.
                </p>

                <div className="space-y-2">
                  <button
                    onClick={() => handleSiteDelete(showDeleteModal)}
                    disabled={deleting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium
                               text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    {deleting ? '삭제 중...' : '삭제'}
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(null)}
                    disabled={deleting}
                    className="w-full px-4 py-2.5 text-sm font-medium
                               border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
                               rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    취소
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
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

      {/* Back button (from "publish to another site") */}
      {showPublishForm && hasPublishedSites && (
        <motion.div variants={itemVariants}>
          <button
            onClick={() => {
              setShowPublishForm(false)
              setError('')
            }}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <ChevronUp className="w-4 h-4 rotate-[-90deg]" />
            발행 목록으로 돌아가기
          </button>
        </motion.div>
      )}

      {/* ─── Site selection: 2-row horizontal scroll grid ─── */}
      <motion.div variants={itemVariants}>
        {sortedFormSites.length > 1 ? (
          <div>
            <div className="overflow-x-auto -mx-6 px-6 scrollbar-hide">
              <div className="grid grid-rows-2 grid-flow-col auto-cols-max gap-2 pb-1">
                {sortedFormSites.map((site) => {
                  const isSelected = selectedSiteIds.includes(site.id)
                  const host = extractDomain(site.siteUrl)
                  const displayName = site.displayName || host
                  return (
                    <button
                      key={site.id}
                      onClick={() => handleSiteToggle(site.id)}
                      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-all whitespace-nowrap
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
                    </button>
                  )
                })}
              </div>
            </div>
            {/* Selection count */}
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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          발행 상태
        </label>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="wp-status"
              value="publish"
              checked={publishStatus === 'publish'}
              onChange={(e) => setPublishStatus(e.target.value as 'draft' | 'publish' | 'future')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">공개 발행</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="wp-status"
              value="draft"
              checked={publishStatus === 'draft'}
              onChange={(e) => setPublishStatus(e.target.value as 'draft' | 'publish' | 'future')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">임시 저장</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="wp-status"
              value="future"
              checked={publishStatus === 'future'}
              onChange={(e) => setPublishStatus(e.target.value as 'draft' | 'publish' | 'future')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">예약 발행</span>
          </label>
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            예약 일시
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={schedule.date}
              min={getTodayDateStr()}
              onChange={(e) => { setSchedule(s => ({ ...s, date: e.target.value })); setError('') }}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="time"
              value={schedule.time}
              onChange={(e) => { setSchedule(s => ({ ...s, time: e.target.value })); setError('') }}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {schedule.date && schedule.time && new Date(`${schedule.date}T${schedule.time}`).getTime() <= Date.now() && (
            <p className="text-xs text-red-500 mt-1.5">현재 시간보다 이후의 시간을 선택해주세요.</p>
          )}
        </motion.div>
      )}

      {/* ─── Categories: per-site tab UI ─── */}
      {(() => {
        // Determine which sites have categories loaded
        const sitesWithCategories = selectedSiteIds.filter(id => {
          const data = perSiteData[id]
          return data && data.categories.length > 0
        })

        if (sitesWithCategories.length === 0 && !anySiteLoading) return null

        return (
          <motion.div variants={itemVariants}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              카테고리
            </label>

            {/* Multi-site: Underline tab bar */}
            {selectedSiteIds.length >= 2 && sitesWithCategories.length > 0 && (
              <div className="overflow-x-auto scrollbar-hide mb-2 border-b border-gray-200 dark:border-gray-700">
                <div className="flex">
                  {sortedSelectedSiteIds.map(siteId => {
                    const data = perSiteData[siteId]
                    if (!data || data.categories.length === 0) return null
                    const isActive = activeCategoryTab === siteId
                    const selectedCount = data.selectedCategories.length
                    return (
                      <button
                        key={siteId}
                        onClick={() => setActiveCategoryTab(siteId)}
                        className={`flex items-center gap-1.5 px-3 pb-2 pt-1 text-xs font-medium whitespace-nowrap border-b-2 transition-colors
                          ${isActive
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
                          }`}
                      >
                        {getSiteName(siteId)}
                        {selectedCount > 0 && (
                          <span className={`inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold rounded-full
                            ${isActive
                              ? 'bg-indigo-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300'
                            }`}>
                            {selectedCount}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Category chips for active tab (or single site) — collapsible recursive groups */}
            {(() => {
              const targetSiteId = selectedSiteIds.length >= 2
                ? activeCategoryTab
                : selectedSiteIds[0]
              if (!targetSiteId) return null
              const data = perSiteData[targetSiteId]
              if (!data || data.categories.length === 0) return null

              const tree = buildCategoryTree(data.categories)

              // Count selected categories in a subtree (excluding the node itself)
              const countSelectedChildren = (node: CategoryNode): number => {
                let count = 0
                for (const child of node.children) {
                  if (data.selectedCategories.includes(child.id)) count++
                  count += countSelectedChildren(child)
                }
                return count
              }

              const renderChip = (node: CategoryNode, isGroupParent?: boolean) => {
                const isSelected = data.selectedCategories.includes(node.id)
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => handleCategoryToggle(targetSiteId, node.id)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    } ${isGroupParent && !isSelected ? 'font-medium' : ''}`}
                  >
                    {node.name}
                  </button>
                )
              }

              const renderGroup = (node: CategoryNode, depth: number): React.ReactNode => {
                const leaves = node.children.filter(c => c.children.length === 0)
                const branches = node.children.filter(c => c.children.length > 0)
                const isCollapsed = collapsedGroups.has(node.id)
                const selectedChildCount = countSelectedChildren(node)

                return (
                  <div
                    key={node.id}
                    className={`p-2 rounded-lg border ${
                      depth === 0
                        ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700/50'
                        : 'bg-white/60 dark:bg-gray-800/30 border-gray-200/60 dark:border-gray-600/30'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {renderChip(node, true)}
                      {/* Collapse/Expand toggle */}
                      <button
                        type="button"
                        onClick={() => toggleGroup(node.id)}
                        className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                      </button>
                      {/* Collapsed: selected count badge */}
                      {isCollapsed && selectedChildCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                          {selectedChildCount}개 선택
                        </span>
                      )}
                      {/* Expanded: leaf children */}
                      {!isCollapsed && leaves.length > 0 && (
                        <>
                          <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 flex-shrink-0" />
                          {leaves.map(leaf => renderChip(leaf))}
                        </>
                      )}
                    </div>
                    {/* Expanded: sub-groups */}
                    {!isCollapsed && branches.length > 0 && (
                      <div className="space-y-1.5 ml-3 mt-1.5">
                        {branches.map(b => renderGroup(b, depth + 1))}
                      </div>
                    )}
                  </div>
                )
              }

              const standalone = tree.filter(n => n.children.length === 0)
              const groups = tree.filter(n => n.children.length > 0)

              // Selected category names for summary
              const selectedCatNames = data.selectedCategories.map(id => {
                const cat = data.categories.find(c => c.id === id)
                return cat ? { id, name: cat.name } : null
              }).filter(Boolean) as { id: number; name: string }[]

              return (
                <div className="space-y-2">
                  {/* Selected summary chips */}
                  {selectedCatNames.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-gray-400 dark:text-gray-500 mr-0.5">선택됨</span>
                      {selectedCatNames.map(cat => (
                        <span
                          key={cat.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium
                                     bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full"
                        >
                          {cat.name}
                          <button
                            type="button"
                            onClick={() => handleCategoryToggle(targetSiteId, cat.id)}
                            className="hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Category tree — max height with scroll */}
                  <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
                    {standalone.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {standalone.map(cat => renderChip(cat))}
                      </div>
                    )}
                    {groups.map(node => renderGroup(node, 0))}
                  </div>
                </div>
              )
            })()}
          </motion.div>
        )
      })()}

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
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              대표 이미지
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {postImages.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setFeaturedImageUrl(url)}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                  featuredImageUrl === url
                    ? 'border-blue-500 ring-2 ring-blue-500/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`이미지 ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                {featuredImageUrl === url && (
                  <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 mt-3 cursor-pointer">
            <input
              type="checkbox"
              checked={removeFeaturedFromContent}
              onChange={(e) => setRemoveFeaturedFromContent(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              대표 이미지를 본문에서 제거
            </span>
          </label>
          <p className="ml-6 text-xs text-gray-400 dark:text-gray-500">
            해제 시 WordPress 테마 설정에 따라 대표 이미지가 본문에 중복으로 표시될 수 있습니다.
          </p>
        </motion.div>
      )}

      {/* Tags */}
      <motion.div variants={itemVariants}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Tag className="w-4 h-4 inline mr-1" />
          태그
        </label>
        {keywordTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {keywordTags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium
                           bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300
                           rounded-full"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => setKeywordTags((prev) => prev.filter((_, j) => j !== i))}
                  className="ml-0.5 hover:text-indigo-900 dark:hover:text-indigo-100 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <input
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
          className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700
                     rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">발행 시 WordPress 태그로 자동 생성됩니다.</p>
      </motion.div>

      {/* SEO options (collapsible) */}
      <motion.div variants={itemVariants} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          onClick={() => setSeoOpen(!seoOpen)}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            SEO 옵션
          </span>
          {seoOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </button>
        {seoOpen && (
          <div className="px-3 pb-3 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                슬러그 (URL)
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="my-post-slug"
                className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700
                           rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-0.5">비워두면 WordPress가 자동 생성합니다.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                요약 (Excerpt)
              </label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="글 요약을 입력하세요..."
                rows={3}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700
                           rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                           focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* Comment setting */}
      <motion.div variants={itemVariants} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">댓글 허용</span>
        </div>
        <button
          type="button"
          onClick={handleCommentStatusToggle}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            commentStatus === 'open'
              ? 'bg-blue-600'
              : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              commentStatus === 'open' ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </motion.div>

      {/* Empty paragraph removal */}
      <motion.div variants={itemVariants} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">빈 줄 제거</span>
          <button
            type="button"
            onClick={handleRemoveEmptyToggle}
            className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
              removeEmptyParagraphs
                ? 'bg-blue-600'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                removeEmptyParagraphs ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 leading-relaxed">
          WordPress 테마의 단락 하단 여백과 원본의 빈 줄이 합쳐지면 행간이 과도하게 벌어질 수 있습니다. 켜두면 발행 시 빈 줄을 자동 제거합니다.
        </p>
      </motion.div>

      {/* Publish history (in form view) */}
      {publishHistory.length > 0 && (
        <motion.div variants={itemVariants} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
          </button>
          {historyOpen && (
            <div className="px-3 pb-3 space-y-2">
              {publishHistory.map((entry, i) => {
                const actionLabels: Record<string, { label: string; color: string }> = {
                  published: { label: '발행', color: 'text-green-600 dark:text-green-400' },
                  updated: { label: '업데이트', color: 'text-blue-600 dark:text-blue-400' },
                  deleted: { label: '삭제', color: 'text-red-600 dark:text-red-400' },
                  scheduled: { label: '예약', color: 'text-purple-600 dark:text-purple-400' },
                }
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
        </motion.div>
      )}

      </motion.div>

      {/* ─── Publish button — sticky bottom ─── */}
      <div className="sticky bottom-0 px-6 py-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm
                      border-t border-gray-100 dark:border-gray-800">
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
            <motion.button
              key="publish-btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handlePublish}
              disabled={publishing}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium
                         bg-gradient-to-r from-blue-600 to-indigo-600 text-white
                         rounded-lg hover:from-blue-700 hover:to-indigo-700
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all shadow-md hover:shadow-lg"
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
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Overwrite confirmation modal */}
      <AnimatePresence>
        {showOverwriteModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowOverwriteModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-sm mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6"
            >
              <button
                onClick={() => setShowOverwriteModal(false)}
                className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  기존 글이 존재합니다
                </h3>
              </div>

              {overwriteSiteIds.length === 1 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
                  이 사이트에 이미 발행된 글이 있습니다. 새로 발행하면 발행 주소가 덮어씌워집니다.
                </p>
              ) : (
                <div className="mb-5">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    다음 사이트에 이미 발행된 글이 있습니다:
                  </p>
                  <ul className="space-y-1 ml-1">
                    {overwriteSiteIds.map(id => (
                      <li key={id} className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                        <Globe className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        {getSiteName(id)}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    새로 발행하면 발행 주소가 덮어씌워집니다.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={() => {
                    setShowOverwriteModal(false)
                    doMultiPublish()
                  }}
                  className="w-full px-4 py-2.5 text-sm font-medium
                             bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  새로 발행
                </button>
                <button
                  onClick={() => setShowOverwriteModal(false)}
                  className="w-full px-4 py-2.5 text-sm font-medium
                             border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
                             rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  취소
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* No category confirmation modal */}
      <AnimatePresence>
        {showNoCategoryModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowNoCategoryModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-sm mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6"
            >
              <button
                onClick={() => setShowNoCategoryModal(false)}
                className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  카테고리 미선택
                </h3>
              </div>

              {noCategorySiteIds.length === 1 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
                  카테고리를 선택하지 않았습니다. 그래도 발행하시겠습니까?
                </p>
              ) : (
                <div className="mb-5">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    다음 사이트에 카테고리가 선택되지 않았습니다:
                  </p>
                  <ul className="space-y-1 ml-1">
                    {noCategorySiteIds.map(id => (
                      <li key={id} className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                        <Globe className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        {getSiteName(id)}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    그래도 발행하시겠습니까?
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={() => {
                    setShowNoCategoryModal(false)
                    proceedMultiPublish()
                  }}
                  className="w-full px-4 py-2.5 text-sm font-medium
                             bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  그래도 발행
                </button>
                <button
                  onClick={() => setShowNoCategoryModal(false)}
                  className="w-full px-4 py-2.5 text-sm font-medium
                             border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
                             rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  취소
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
