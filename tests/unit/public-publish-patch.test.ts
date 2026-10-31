// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/firebase-admin', () => ({ getDb: vi.fn() }))
vi.mock('@/lib/api-helpers', () => ({ getOwnedDocument: vi.fn() }))
vi.mock('@/lib/api-handler', () => ({
  createApiHandler: (_options: unknown, handler: (request: Request, context: unknown) => unknown) =>
    (request: Request) => handler(request, { auth: { userId: 'owner', email: 'owner@example.test' } }),
}))

import { PATCH } from '@/app/api/public/publish/route'
import { getOwnedDocument } from '@/lib/api-helpers'
import { countContentChars } from '@/lib/utils'

describe('Public post PATCH metadata', () => {
  const update = vi.fn()
  const existing = {
    title: 'Existing title', content: '<p>Original body</p>', status: 'draft',
    metadata: { source: 'api', wordCount: 13, thumbnailUrl: 'https://example.test/old.png', campaign: 'keep' },
  }
  beforeEach(() => {
    vi.clearAllMocks()
    update.mockResolvedValue(undefined)
    vi.mocked(getOwnedDocument).mockResolvedValue({ docRef: { update }, data: existing } as never)
  })
  const request = (body: unknown) => new Request('https://studio.example.test/api/public/publish', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  const patch = (body: unknown) => PATCH(request(body) as never, {} as never)

  it('updates an existing thumbnail and preserves unrelated metadata', async () => {
    const response = await patch({ id: 'existing-id', metadata: { thumbnailUrl: 'https://example.test/new.png' } })
    expect(response.status).toBe(200)
    expect(getOwnedDocument).toHaveBeenCalledWith('blog_posts', 'existing-id', expect.objectContaining({ userId: 'owner' }), '게시글', false)
    expect(update).toHaveBeenCalledTimes(1)
    expect(update.mock.calls[0][0].metadata).toEqual({ ...existing.metadata, thumbnailUrl: 'https://example.test/new.png' })
    expect(update.mock.calls[0][0]).not.toHaveProperty('status')
    expect(update.mock.calls[0][0]).not.toHaveProperty('title')
  })

  it('updates content and thumbnail together with a fresh server-derived count', async () => {
    const content = '<p>새로운 본문</p>'
    await patch({ id: 'existing-id', content, metadata: { thumbnailUrl: 'https://example.test/new.png', wordCount: 999 } })
    const written = update.mock.calls[0][0]
    expect(written.content).toBe(content)
    expect(written.metadata).toEqual({ ...existing.metadata, thumbnailUrl: 'https://example.test/new.png', wordCount: countContentChars(content) })
    expect(Object.hasOwn(written, 'metadata.wordCount')).toBe(false)
  })

  it('retains the previous field-level count update for content-only requests', async () => {
    await patch({ id: 'existing-id', content: '<p>Changed</p>' })
    const written = update.mock.calls[0][0]
    expect(written['metadata.wordCount']).toBe(countContentChars('<p>Changed</p>'))
    expect(written).not.toHaveProperty('metadata')
  })

  it.each([null, [], 'bad', { thumbnailUrl: 'javascript:alert(1)' }, { thumbnailUrl: 'not-a-url' }])('rejects invalid metadata before writing: %j', async metadata => {
    await expect(patch({ id: 'existing-id', metadata })).rejects.toThrow()
    expect(update).not.toHaveBeenCalled()
  })
})

describe('Public post PATCH addPublishedUrl', () => {
  const update = vi.fn()
  const setExisting = (data: Record<string, unknown>) =>
    vi.mocked(getOwnedDocument).mockResolvedValue({ docRef: { update }, data: { title: 't', content: '<p>c</p>', status: 'draft', ...data } } as never)
  beforeEach(() => { vi.clearAllMocks(); update.mockResolvedValue(undefined) })
  const patch = (body: unknown) => PATCH(new Request('https://studio.example.test/api/public/publish', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }) as never, {} as never)
  const tistory = 'https://blog.tistory.com/141'

  it('appends to existing addresses and keeps the primary address', async () => {
    setExisting({ publishedUrls: ['https://wp.example.test/a'], publishedUrl: 'https://wp.example.test/a' })
    const response = await patch({ id: 'p1', addPublishedUrl: tistory, status: 'published' })
    const written = update.mock.calls[0][0]
    expect(written.publishedUrls).toEqual(['https://wp.example.test/a', tistory])
    expect(written).not.toHaveProperty('publishedUrl')
    expect(written.status).toBe('published')
    const json = await response.json()
    expect(json.data.publishedUrls).toEqual(['https://wp.example.test/a', tistory])
    expect(json.data.publishedUrl).toBe('https://wp.example.test/a')
  })

  it('sets the primary address when none exists', async () => {
    setExisting({})
    await patch({ id: 'p1', addPublishedUrl: tistory })
    expect(update.mock.calls[0][0]).toMatchObject({ publishedUrls: [tistory], publishedUrl: tistory })
  })

  it('does not duplicate an address that is already listed', async () => {
    setExisting({ publishedUrls: [tistory], publishedUrl: tistory })
    await patch({ id: 'p1', addPublishedUrl: tistory })
    expect(update.mock.calls[0][0].publishedUrls).toEqual([tistory])
  })

  it('seeds the list from a legacy single publishedUrl', async () => {
    setExisting({ publishedUrl: 'https://legacy.example.test/x' })
    await patch({ id: 'p1', addPublishedUrl: tistory })
    expect(update.mock.calls[0][0].publishedUrls).toEqual(['https://legacy.example.test/x', tistory])
  })

  it.each(['not-a-url', 'javascript:alert(1)', 42, ''])('rejects invalid addPublishedUrl before writing: %j', async value => {
    setExisting({})
    await expect(patch({ id: 'p1', addPublishedUrl: value, status: 'published' })).rejects.toThrow()
    expect(update).not.toHaveBeenCalled()
  })
})
