import { z } from 'zod'
import { TimestampSchema } from './common'

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
