import DOMPurify from 'dompurify'

// iframe 허용 도메인 화이트리스트
const ALLOWED_IFRAME_DOMAINS = [
  'youtube.com',
  'www.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
  'vimeo.com',
  'codepen.io',
  'codesandbox.io',
  'stackblitz.com',
  'docs.google.com',
  'maps.google.com',
  'www.google.com',
]

function isAllowedIframeSrc(src: string): boolean {
  try {
    const url = new URL(src)
    return ALLOWED_IFRAME_DOMAINS.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`))
  } catch {
    return false
  }
}

// DOMPurify 초기화 (브라우저 환경에서만)
let configured = false

function ensureConfigured() {
  if (configured) return
  configured = true

  // 위험한 iframe 제거
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'IFRAME') {
      const src = node.getAttribute('src') || ''
      if (!isAllowedIframeSrc(src)) {
        node.remove()
      }
    }
  })
}

/**
 * HTML 콘텐츠를 안전하게 정제
 * - iframe은 화이트리스트 도메인만 허용
 * - 기본 XSS 방지 (script, on* 이벤트 제거)
 */
export function sanitizeHtml(html: string, extraAttrs: string[] = []): string {
  ensureConfigured()
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['target', 'rel', 'style', ...extraAttrs],
    ADD_TAGS: ['iframe'],
  })
}
