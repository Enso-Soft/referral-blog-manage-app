import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow, addHours } from 'date-fns'
import { ko } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Firestore Timestamp를 한국어 날짜 문자열로 포맷팅
 * @param timestamp Firestore Timestamp 또는 Date 객체
 * @param options 포맷 옵션 (시간 포함 여부)
 */
export function formatDate(
    timestamp: unknown,
    options: { includeTime?: boolean } = {}
): string {
    const date = toDate(timestamp)
    if (!date) return ''

    const formatStr = options.includeTime ? 'yyyy년 M월 d일 HH:mm' : 'yyyy년 M월 d일'
    return format(date, formatStr, { locale: ko })
}

/**
 * Firestore Timestamp → Date 변환 (공통 헬퍼)
 */
export function toDate(timestamp: unknown): Date | null {
    if (!timestamp) return null
    if (timestamp instanceof Date) return timestamp
    const ts = timestamp as Record<string, unknown>
    if (ts._seconds) return new Date((ts._seconds as number) * 1000)
    if (ts.seconds) return new Date((ts.seconds as number) * 1000)
    if (typeof ts.toDate === 'function') return (ts as { toDate: () => Date }).toDate()
    const d = new Date(timestamp as string | number)
    return isNaN(d.getTime()) ? null : d
}

/**
 * date-fns 기반 날짜 포맷 (한국어)
 */
export function formatDateFns(
    timestamp: unknown,
    formatStr: string = 'yyyy년 M월 d일'
): string {
    const date = toDate(timestamp)
    if (!date) return ''
    return format(date, formatStr, { locale: ko })
}

/**
 * 상대 시간 포맷 ("3시간 전", "2일 전")
 */
export function formatRelativeTimeFns(timestamp: unknown): string {
    const date = toDate(timestamp)
    if (!date) return ''
    return formatDistanceToNow(date, { addSuffix: true, locale: ko })
}

/**
 * HTML 콘텐츠에서 태그와 공백을 제거한 순수 글자 수
 */
export function countContentChars(html: string): number {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, '').length
}

export { format, formatDistanceToNow, addHours } from 'date-fns'
export { ko as koLocale } from 'date-fns/locale'

/**
 * 함수 호출을 지정된 시간 간격으로 제한
 * @param fn 스로틀링할 함수
 * @param delay 지연 시간 (ms)
 */
export function throttle<T extends (...args: Parameters<T>) => void>(
    fn: T,
    delay: number
): T {
    let lastCall = 0
    let timeoutId: NodeJS.Timeout | null = null

    return ((...args: Parameters<T>) => {
        const now = Date.now()
        const timeSinceLastCall = now - lastCall

        if (timeSinceLastCall >= delay) {
            lastCall = now
            fn(...args)
        } else {
            if (timeoutId) clearTimeout(timeoutId)
            timeoutId = setTimeout(() => {
                lastCall = Date.now()
                fn(...args)
            }, delay - timeSinceLastCall)
        }
    }) as T
}

/**
 * 함수 호출을 지연시키고 마지막 호출만 실행
 * @param fn 디바운스할 함수
 * @param delay 지연 시간 (ms)
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
    fn: T,
    delay: number
): T {
    let timeoutId: NodeJS.Timeout | null = null

    return ((...args: Parameters<T>) => {
        if (timeoutId) clearTimeout(timeoutId)
        timeoutId = setTimeout(() => fn(...args), delay)
    }) as T
}

/**
 * 이미지 파일을 리사이즈하여 새 File 객체로 반환
 * 긴 변 기준으로 maxSize에 맞추고 JPEG로 변환
 */
export async function resizeImageFile(
    file: File,
    maxSize: number = 1920,
    quality: number = 0.80
): Promise<File> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
            let { width, height } = img

            // 비율 유지하며 축소 (maxSize 초과 시)
            if (width > maxSize || height > maxSize) {
                if (width > height) {
                    height = Math.round(height * (maxSize / width))
                    width = maxSize
                } else {
                    width = Math.round(width * (maxSize / height))
                    height = maxSize
                }
            }

            // 항상 canvas를 거쳐 WebP 압축 적용
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(img, 0, 0, width, height)
            URL.revokeObjectURL(img.src)

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('이미지 압축 실패'))
                        return
                    }
                    const resized = new File([blob], file.name.replace(/\.\w+$/, '.webp'), {
                        type: 'image/webp',
                        lastModified: Date.now(),
                    })
                    resolve(resized)
                },
                'image/webp',
                quality
            )
        }
        img.onerror = () => reject(new Error('이미지 로드 실패'))
        img.src = URL.createObjectURL(file)
    })
}
