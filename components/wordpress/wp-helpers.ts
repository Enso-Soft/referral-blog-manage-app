import { addHours, format, toDate } from '@/lib/utils'

export function extractImagesFromHtml(content: string): string[] {
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/g
  const images: string[] = []
  let match
  while ((match = imgRegex.exec(content)) !== null) {
    images.push(match[1])
  }
  return images
}

export function getDefaultSchedule() {
  const d = addHours(new Date(), 1)
  d.setMinutes(0, 0, 0)
  return {
    date: format(d, 'yyyy-MM-dd'),
    time: format(d, 'HH:00'),
  }
}

export function getTodayDateStr(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function timestampToMs(ts: unknown): number {
  return toDate(ts)?.getTime() ?? 0
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

// --- Category tree helpers ---
export interface CategoryNode {
  id: number
  name: string
  parent: number
  children: CategoryNode[]
}

export function buildCategoryTree(categories: { id: number; name: string; parent: number }[]): CategoryNode[] {
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
export interface WPSiteSelections {
  lastSelected: string[]
  lastSelectedAt: Record<string, number>
}

export function getStoredSiteSelections(): WPSiteSelections {
  if (typeof window === 'undefined') return { lastSelected: [], lastSelectedAt: {} }
  try {
    const raw = localStorage.getItem('wp-site-selections')
    if (!raw) return { lastSelected: [], lastSelectedAt: {} }
    return JSON.parse(raw)
  } catch {
    return { lastSelected: [], lastSelectedAt: {} }
  }
}

export function saveStoredSiteSelections(siteIds: string[]) {
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
export interface WPSiteInfo {
  id: string
  siteUrl: string
  displayName: string | null
}

export interface PerSiteData {
  categories: { id: number; name: string; parent: number }[]
  wpTags: { id: number; name: string }[]
  selectedCategories: number[]
  loading: boolean
}

export interface SitePublishStatus {
  status: 'pending' | 'resolving_tags' | 'publishing' | 'success' | 'failed'
  wpPostId?: number
  wpPostUrl?: string
  postStatus?: string
  error?: string
}

// Animation variants
export const containerVariants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.05 },
  },
}

export const itemVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

// Publish step messages
export const PUBLISH_STEPS = [
  { key: 'tags', message: '태그 생성 중...' },
  { key: 'images', message: '이미지를 WordPress로 업로드 중...' },
  { key: 'publish', message: '글을 발행하는 중...' },
  { key: 'almost', message: '거의 완료되었습니다...' },
]

export interface WordPressPanelProps {
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
