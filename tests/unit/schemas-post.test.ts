import { describe, it, expect } from 'vitest'
import { CreatePostSchema, UpdatePostSchema, BlogPostSchema, ProductSchema } from '@/lib/schemas/post'

describe('ProductSchema', () => {
  it('유효한 제품', () => {
    const result = ProductSchema.safeParse({ name: '테스트 제품', affiliateLink: 'https://example.com' })
    expect(result.success).toBe(true)
  })

  it('잘못된 URL', () => {
    const result = ProductSchema.safeParse({ name: '테스트', affiliateLink: 'not-a-url' })
    expect(result.success).toBe(false)
  })

  it('name 누락', () => {
    const result = ProductSchema.safeParse({ affiliateLink: 'https://example.com' })
    expect(result.success).toBe(false)
  })
})

describe('CreatePostSchema', () => {
  it('유효한 생성 요청', () => {
    const result = CreatePostSchema.safeParse({
      title: '테스트 포스트',
      content: '<p>내용</p>',
      slug: 'test-post',
      excerpt: '요약',
      keywords: ['키워드1'],
    })
    expect(result.success).toBe(true)
  })

  it('기본값 적용 (status, postType)', () => {
    const result = CreatePostSchema.parse({
      title: '테스트',
      content: '',
      slug: 'test',
      excerpt: '요약',
    })
    expect(result.status).toBe('draft')
    expect(result.postType).toBe('general')
  })

  it('제목 필수', () => {
    const result = CreatePostSchema.safeParse({
      content: '',
      slug: 'test',
      excerpt: '요약',
    })
    expect(result.success).toBe(false)
  })

  it('slug 필수', () => {
    const result = CreatePostSchema.safeParse({
      title: '테스트',
      content: '',
      excerpt: '요약',
    })
    expect(result.success).toBe(false)
  })

  it('products 옵션', () => {
    const result = CreatePostSchema.safeParse({
      title: '테스트',
      content: '',
      slug: 'test',
      excerpt: '요약',
      products: [{ name: '제품', affiliateLink: 'https://example.com' }],
    })
    expect(result.success).toBe(true)
  })
})

describe('UpdatePostSchema', () => {
  it('부분 업데이트 (title만)', () => {
    const result = UpdatePostSchema.safeParse({ title: '새 제목' })
    expect(result.success).toBe(true)
  })

  it('빈 객체 허용', () => {
    const result = UpdatePostSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('잘못된 status', () => {
    const result = UpdatePostSchema.safeParse({ status: 'invalid' })
    expect(result.success).toBe(false)
  })
})
