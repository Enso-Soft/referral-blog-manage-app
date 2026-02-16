/**
 * URL 관련 유틸리티 함수들
 */

/**
 * URL의 유효성을 검사합니다
 * @param url 검사할 URL 문자열
 * @returns URL이 유효한 http 또는 https인지 여부
 */
export function isValidUrl(url: string): boolean {
  if (!url.trim()) return true
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * URL에서 파비콘 URL을 생성합니다 (Google Favicon API 사용)
 * @param url 파비콘을 가져올 URL
 * @returns 파비콘 URL 또는 실패 시 null
 */
export function getFaviconUrl(url: string): string | null {
  try {
    const domain = new URL(url).hostname
    return `https://icons.duckduckgo.com/ip3/${domain}.ico`
  } catch {
    return null
  }
}

/**
 * HTML 콘텐츠에서 이미지 URL들을 추출합니다
 * @param content HTML 콘텐츠 문자열
 * @returns 추출된 이미지 URL 배열
 */
export function extractImagesFromContent(content: string): string[] {
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/g
  const images: string[] = []
  let match
  while ((match = imgRegex.exec(content)) !== null) {
    images.push(match[1])
  }
  return images
}
