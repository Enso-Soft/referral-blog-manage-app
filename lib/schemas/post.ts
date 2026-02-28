import { z } from 'zod'
import { TimestampSchema } from './common'

// TimestampSchema re-export (하위호환)
export { TimestampSchema }

// Product 스키마
export const ProductSchema = z.object({
  name: z.string(),
  affiliateLink: z.string().url(),
})

export type Product = z.infer<typeof ProductSchema>

// Re-export from split schema files
export {
  SeoKeywordSchema, SeoTitleOptionSchema, SerpCompetitorSchema, BlogCompetitionSchema,
  TrendKeywordSchema, ShoppingDataSchema, SeoAnalysisSchema, KeywordCandidateSchema,
  TrendDataSchema, TrendDataPointSchema,
  type SeoKeyword, type SeoTitleOption, type SerpCompetitor, type BlogCompetition,
  type TrendKeyword, type ShoppingData, type SeoAnalysis, type KeywordCandidate,
  type TrendData, type TrendDataPoint,
} from './seo'

export {
  ThreadsContentSchema,
  type ThreadsContent,
} from './threads'

export {
  WPSiteSchema, WPPublishHistoryEntrySchema, WPSitePublishDataSchema, WordPressContentSchema,
  type WPSite, type WPPublishHistoryEntry, type WPSitePublishData, type WordPressContent,
} from './wordpress'

// 여기서 import하여 BlogPost 스키마에 사용
import { SeoAnalysisSchema } from './seo'
import { ThreadsContentSchema } from './threads'
import { WordPressContentSchema } from './wordpress'

// BlogPost 스키마
export const BlogPostSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  userEmail: z.string().email().optional(),
  title: z.string(),
  content: z.string(),
  keywords: z.array(z.string()),
  products: z.array(ProductSchema).optional(),
  publishedUrl: z.string().url().optional(),
  publishedUrls: z.array(z.string().url()).optional(),
  postType: z.enum(['general', 'affiliate']).optional(),
  status: z.enum(['draft', 'published']),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  seoAnalysis: SeoAnalysisSchema.optional(),
  threads: ThreadsContentSchema.optional(),
  wordpress: WordPressContentSchema.optional(),
  metadata: z.object({
    originalPath: z.string().optional(),
    wordCount: z.number(),
  }),
})

export type BlogPost = z.infer<typeof BlogPostSchema>

// 생성 요청용 스키마 (id, timestamps 제외)
export const CreatePostSchema = z.object({
  title: z.string().min(1, '제목은 필수입니다'),
  content: z.string(),
  slug: z.string().min(1, 'slug는 필수입니다'),
  excerpt: z.string().min(1, 'excerpt는 필수입니다'),
  keywords: z.array(z.string()).default([]),
  products: z.array(ProductSchema).optional(),
  postType: z.enum(['general', 'affiliate']).default('general'),
  status: z.enum(['draft', 'published']).default('draft'),
  seoAnalysis: SeoAnalysisSchema.optional(),
  threads: ThreadsContentSchema.optional(),
  wordpress: WordPressContentSchema.optional(),
  metadata: z.object({
    originalPath: z.string().optional(),
    wordCount: z.number(),
  }).optional(),
})

export type CreatePostInput = z.infer<typeof CreatePostSchema>

// 수정 요청용 스키마 (부분 업데이트)
export const UpdatePostSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  products: z.array(ProductSchema).optional(),
  publishedUrl: z.union([z.string().url(), z.literal('')]).optional(),
  publishedUrls: z.array(z.union([z.string().url(), z.literal('')])).optional(),
  postType: z.enum(['general', 'affiliate']).optional(),
  status: z.enum(['draft', 'published']).optional(),
  seoAnalysis: SeoAnalysisSchema.optional(),
  threads: ThreadsContentSchema.optional(),
  wordpress: WordPressContentSchema.optional(),
  metadata: z.object({
    originalPath: z.string().optional(),
    wordCount: z.number(),
  }).optional(),
})

export type UpdatePostInput = z.infer<typeof UpdatePostSchema>
