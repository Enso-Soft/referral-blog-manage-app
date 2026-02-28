import { describe, it, expect } from 'vitest'

// server-only를 mock (테스트에서는 불필요)
vi.mock('server-only', () => ({}))

import { validateImageBuffer } from '@/lib/file-validation'

describe('validateImageBuffer', () => {
  it('유효한 PNG', () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    expect(validateImageBuffer(buffer, 'image/png')).toBe(true)
  })

  it('유효한 JPEG', () => {
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0])
    expect(validateImageBuffer(buffer, 'image/jpeg')).toBe(true)
  })

  it('유효한 GIF87a', () => {
    const buffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61])
    expect(validateImageBuffer(buffer, 'image/gif')).toBe(true)
  })

  it('유효한 WebP', () => {
    const buffer = Buffer.from([0x52, 0x49, 0x46, 0x46])
    expect(validateImageBuffer(buffer, 'image/webp')).toBe(true)
  })

  it('MIME 불일치 (PNG 바이트인데 JPEG 선언)', () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47])
    expect(validateImageBuffer(buffer, 'image/jpeg')).toBe(false)
  })

  it('지원하지 않는 형식', () => {
    const buffer = Buffer.from([0x00, 0x00])
    expect(validateImageBuffer(buffer, 'image/bmp')).toBe(false)
  })

  it('유효한 SVG', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
    const buffer = Buffer.from(svg, 'utf-8')
    expect(validateImageBuffer(buffer, 'image/svg+xml')).toBe(true)
  })

  it('SVG + script 태그 차단', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    const buffer = Buffer.from(svg, 'utf-8')
    expect(validateImageBuffer(buffer, 'image/svg+xml')).toBe(false)
  })

  it('SVG + onload 이벤트 차단', () => {
    const svg = '<svg onload="alert(1)" xmlns="http://www.w3.org/2000/svg"></svg>'
    const buffer = Buffer.from(svg, 'utf-8')
    expect(validateImageBuffer(buffer, 'image/svg+xml')).toBe(false)
  })

  it('SVG + javascript: 프로토콜 차단', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)">click</a></svg>'
    const buffer = Buffer.from(svg, 'utf-8')
    expect(validateImageBuffer(buffer, 'image/svg+xml')).toBe(false)
  })
})
