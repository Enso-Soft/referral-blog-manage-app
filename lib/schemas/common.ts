import { z } from 'zod'

// Firestore Timestamp 스키마 (런타임에서 다양한 형태로 올 수 있음)
export const TimestampSchema = z.union([
  z.object({
    _seconds: z.number(),
    _nanoseconds: z.number(),
  }),
  z.object({
    seconds: z.number(),
    nanoseconds: z.number(),
  }),
  z.date(),
  z.custom<{ toDate: () => Date }>((val) => {
    return val !== null && typeof val === 'object' && 'toDate' in val && typeof val.toDate === 'function'
  }),
])
