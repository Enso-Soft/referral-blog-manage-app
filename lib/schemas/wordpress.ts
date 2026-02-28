import { z } from 'zod'
import { TimestampSchema } from './common'

// WordPress 사이트 연결 정보 스키마
export const WPSiteSchema = z.object({
  siteUrl: z.string(),
  username: z.string(),
  appPassword: z.string(),
  displayName: z.string().optional(),
  connectedAt: TimestampSchema.optional(),
})

export type WPSite = z.infer<typeof WPSiteSchema>

// WordPress 발행 이력 엔트리 스키마
export const WPPublishHistoryEntrySchema = z.object({
  action: z.enum(['published', 'updated', 'deleted', 'scheduled']),
  timestamp: TimestampSchema,
  wpPostId: z.number().optional(),
  wpPostUrl: z.string().optional(),
  wpSiteId: z.string().optional(),
  wpSiteUrl: z.string().optional(),
  status: z.string().optional(),
  errorMessage: z.string().optional(),
})

export type WPPublishHistoryEntry = z.infer<typeof WPPublishHistoryEntrySchema>

// WordPress 사이트별 발행 데이터 스키마
export const WPSitePublishDataSchema = z.object({
  postStatus: z.enum(['not_published', 'published', 'failed', 'scheduled']).default('not_published'),
  wpPostId: z.number().optional(),
  wpPostUrl: z.string().optional(),
  wpSiteUrl: z.string().optional(),
  publishedAt: TimestampSchema.optional(),
  errorMessage: z.string().optional(),
  lastSyncedAt: TimestampSchema.optional(),
  scheduledAt: TimestampSchema.optional(),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  tags: z.array(z.number()).optional(),
  categories: z.array(z.number()).optional(),
  commentStatus: z.enum(['open', 'closed']).optional(),
})

export type WPSitePublishData = z.infer<typeof WPSitePublishDataSchema>

// WordPress 콘텐츠 스키마
export const WordPressContentSchema = z.object({
  sites: z.record(z.string(), WPSitePublishDataSchema).optional(),
  postStatus: z.enum(['not_published', 'published', 'failed', 'scheduled']).default('not_published'),
  wpPostId: z.number().optional(),
  wpPostUrl: z.string().url().optional(),
  publishedAt: TimestampSchema.optional(),
  errorMessage: z.string().optional(),
  wpSiteId: z.string().optional(),
  wpSiteUrl: z.string().optional(),
  lastSyncedAt: TimestampSchema.optional(),
  scheduledAt: TimestampSchema.optional(),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  tags: z.array(z.number()).optional(),
  categories: z.array(z.number()).optional(),
  commentStatus: z.enum(['open', 'closed']).optional(),
  publishHistory: z.array(WPPublishHistoryEntrySchema).optional(),
})

export type WordPressContent = z.infer<typeof WordPressContentSchema>
