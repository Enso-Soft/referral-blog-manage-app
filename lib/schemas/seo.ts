import { z } from 'zod'

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
  mainKeyword: SeoKeywordSchema,
  subKeywords: z.array(SeoKeywordSchema).optional(),
  trendKeywords: z.array(TrendKeywordSchema).optional(),
  titleOptions: z.array(SeoTitleOptionSchema).optional(),
  searchIntent: z.array(z.object({
    type: z.string(),
    percentage: z.number(),
    keywords: z.array(z.string()).optional(),
    contentDirection: z.string().optional(),
  })).optional(),
  serpCompetitors: z.array(SerpCompetitorSchema).optional(),
  blogCompetition: BlogCompetitionSchema.optional(),
  shoppingData: ShoppingDataSchema.optional(),
  keywordCandidates: z.array(KeywordCandidateSchema).optional(),
  trendData: z.array(TrendDataSchema).optional(),
  insights: z.array(z.string()).optional(),
  risks: z.array(z.string()).optional(),
  analyzedAt: z.string().optional(),
})

export type SeoAnalysis = z.infer<typeof SeoAnalysisSchema>
