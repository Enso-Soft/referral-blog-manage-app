import { z } from 'zod'

// Firestore Timestamp 스키마 (런타임에서 다양한 형태로 올 수 있음)
export const TimestampSchema = z.union([
  // Firebase Admin SDK 형식
  z.object({
    _seconds: z.number(),
    _nanoseconds: z.number(),
  }),
  // Firestore 클라이언트 SDK 형식
  z.object({
    seconds: z.number(),
    nanoseconds: z.number(),
  }),
  // Date 객체
  z.date(),
  // toDate 메서드를 가진 Timestamp 객체 (any로 처리)
  z.custom<{ toDate: () => Date }>((val) => {
    return val !== null && typeof val === 'object' && 'toDate' in val && typeof val.toDate === 'function'
  }),
])

// Product 스키마
export const ProductSchema = z.object({
  name: z.string(),
  affiliateLink: z.string().url(),
})

export type Product = z.infer<typeof ProductSchema>

// SEO 키워드 리서치 스키마 (AI가 글 작성 전 분석한 내용)
export const SeoKeywordSchema = z.object({
  keyword: z.string(),
  monthlyVolume: z.number().optional(),
  pcVolume: z.number().optional(),
  mobileVolume: z.number().optional(),
  competition: z.enum(['low', 'medium', 'high']).optional(),
  serpDifficulty: z.number().min(0).max(100).optional(),
  ctr: z.number().optional(),
  adCount: z.number().optional(),
  recommendation: z.string().optional(),
  reason: z.string().optional(),
})

export type SeoKeyword = z.infer<typeof SeoKeywordSchema>

// 키워드 후보 비교 (AI 의사결정 데이터)
export const KeywordCandidateSchema = z.object({
  keyword: z.string(),
  pcVolume: z.number().optional(),
  mobileVolume: z.number().optional(),
  totalVolume: z.number().optional(),
  competition: z.enum(['low', 'medium', 'high']).optional(),
  serpDifficulty: z.number().min(0).max(100).optional(),
  ctr: z.number().optional(),
  adCount: z.number().optional(),
  recommendation: z.string().optional(),
  selected: z.boolean().optional(),
  reason: z.string().optional(),
})

export type KeywordCandidate = z.infer<typeof KeywordCandidateSchema>

// 트렌드 시계열
export const TrendDataPointSchema = z.object({
  period: z.string(),
  value: z.number(),
})

export type TrendDataPoint = z.infer<typeof TrendDataPointSchema>

export const TrendDataSchema = z.object({
  keyword: z.string(),
  dataPoints: z.array(TrendDataPointSchema),
  summary: z.string().optional(),
})

export type TrendData = z.infer<typeof TrendDataSchema>

export const SeoTitleOptionSchema = z.object({
  title: z.string(),
  length: z.number().optional(),
  reasoning: z.string().optional(),
  selected: z.boolean().optional(),
  keywordCoverage: z.array(z.string()).optional(),
  ctrEstimate: z.string().optional(),
  targetIntent: z.string().optional(),
})

export type SeoTitleOption = z.infer<typeof SeoTitleOptionSchema>

// SERP 경쟁자 블로그 분석
export const SerpCompetitorSchema = z.object({
  rank: z.number(),
  title: z.string(),
  platform: z.string().optional(),
  wordCount: z.number().optional(),
  imageCount: z.number().optional(),
  freshnessDays: z.number().optional(),
  features: z.string().optional(),
})

export type SerpCompetitor = z.infer<typeof SerpCompetitorSchema>

// 블로그 경쟁도 요약
export const BlogCompetitionSchema = z.object({
  serpDifficulty: z.number().min(0).max(100).optional(),
  serpDifficultyLevel: z.string().optional(),
  totalResults: z.number().optional(),
  level: z.string().optional(),
  attackability: z.boolean().optional(),
  attackabilityReason: z.string().optional(),
  avgWordCount: z.number().optional(),
  avgImageCount: z.number().optional(),
  strategy: z.array(z.string()).optional(),
})

export type BlogCompetition = z.infer<typeof BlogCompetitionSchema>

// 트렌드 키워드 (검색량 급상승 키워드)
export const TrendKeywordSchema = z.object({
  keyword: z.string(),
  monthlyVolume: z.number().optional(),
  competition: z.string().optional(),
  trend: z.string().optional(),
  intent: z.string().optional(),
  relevance: z.string().optional(),
  insight: z.string().optional(),
})

export type TrendKeyword = z.infer<typeof TrendKeywordSchema>

// 쇼핑 데이터 (제품 리뷰 글용)
export const ShoppingDataSchema = z.object({
  totalProducts: z.number().optional(),
  averagePrice: z.number().optional(),
  priceRange: z.object({
    min: z.number(),
    max: z.number(),
  }).optional(),
  medianPrice: z.number().optional(),
})

export type ShoppingData = z.infer<typeof ShoppingDataSchema>

export const SeoAnalysisSchema = z.object({
  // 메인 키워드
  mainKeyword: SeoKeywordSchema,
  // 서브 키워드
  subKeywords: z.array(SeoKeywordSchema).optional(),
  // 트렌드 키워드
  trendKeywords: z.array(TrendKeywordSchema).optional(),
  // 타이틀 추천
  titleOptions: z.array(SeoTitleOptionSchema).optional(),
  // 검색 의도 분석
  searchIntent: z.array(z.object({
    type: z.string(),
    percentage: z.number(),
    keywords: z.array(z.string()).optional(),
    contentDirection: z.string().optional(),
  })).optional(),
  // SERP 경쟁자 분석
  serpCompetitors: z.array(SerpCompetitorSchema).optional(),
  // 블로그 경쟁도 요약
  blogCompetition: BlogCompetitionSchema.optional(),
  // 쇼핑 데이터 (제품 리뷰 글용)
  shoppingData: ShoppingDataSchema.optional(),
  // 키워드 후보 비교
  keywordCandidates: z.array(KeywordCandidateSchema).optional(),
  // 트렌드 시계열
  trendData: z.array(TrendDataSchema).optional(),
  // 인사이트
  insights: z.array(z.string()).optional(),
  risks: z.array(z.string()).optional(),
  // 분석 일시
  analyzedAt: z.string().optional(),
})

export type SeoAnalysis = z.infer<typeof SeoAnalysisSchema>

// Threads 콘텐츠 스키마
export const ThreadsContentSchema = z.object({
  text: z.string().max(500, 'Threads 본문은 500자를 초과할 수 없습니다'),
  hashtag: z.string().optional(),
  imageUrl: z.string().url().optional(),
  linkUrl: z.string().url().optional(),
  postStatus: z.enum(['not_posted', 'posted', 'failed']).default('not_posted'),
  threadsPostId: z.string().optional(),
  postedAt: TimestampSchema.optional(),
  errorMessage: z.string().optional(),
})

export type ThreadsContent = z.infer<typeof ThreadsContentSchema>

// WordPress 발행 이력 엔트리 스키마
export const WPPublishHistoryEntrySchema = z.object({
  action: z.enum(['published', 'updated', 'deleted', 'scheduled']),
  timestamp: TimestampSchema,
  wpPostId: z.number().optional(),
  wpPostUrl: z.string().optional(),
  status: z.string().optional(),
  errorMessage: z.string().optional(),
})

export type WPPublishHistoryEntry = z.infer<typeof WPPublishHistoryEntrySchema>

// WordPress 콘텐츠 스키마
export const WordPressContentSchema = z.object({
  // 기존
  postStatus: z.enum(['not_published', 'published', 'failed', 'scheduled']).default('not_published'),
  wpPostId: z.number().optional(),
  wpPostUrl: z.string().url().optional(),
  publishedAt: TimestampSchema.optional(),
  errorMessage: z.string().optional(),
  // 신규
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
  publishedUrl: z.string().url().optional(),
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
