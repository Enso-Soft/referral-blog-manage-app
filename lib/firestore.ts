import { Timestamp } from 'firebase/firestore'

// Zod 스키마에서 타입 re-export (런타임 검증용)
export { BlogPostSchema, ProductSchema, CreatePostSchema, UpdatePostSchema } from './schemas'
export type { Product, BlogPost, CreatePostInput, UpdatePostInput } from './schemas'

// Firestore Timestamp 유틸리티
export type FirestoreTimestamp = Timestamp | { _seconds: number; _nanoseconds: number } | { seconds: number; nanoseconds: number }
