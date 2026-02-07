import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Firestore Timestamp를 한국어 날짜 문자열로 포맷팅
 * @param timestamp Firestore Timestamp 또는 Date 객체
 * @param options 포맷 옵션 (시간 포함 여부)
 */
export function formatDate(
    timestamp: any,
    options: { includeTime?: boolean } = {}
): string {
    if (!timestamp) return ''

    let date: Date
    if (timestamp._seconds) {
        date = new Date(timestamp._seconds * 1000)
    } else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000)
    } else if (typeof timestamp.toDate === 'function') {
        date = timestamp.toDate()
    } else {
        date = new Date(timestamp)
    }

    if (isNaN(date.getTime())) return ''

    const formatOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }

    if (options.includeTime) {
        formatOptions.hour = '2-digit'
        formatOptions.minute = '2-digit'
    }

    return new Intl.DateTimeFormat('ko-KR', formatOptions).format(date)
}

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
    quality: number = 0.85
): Promise<File> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
            let { width, height } = img

            // 리사이즈 필요 없으면 원본 반환
            if (width <= maxSize && height <= maxSize) {
                URL.revokeObjectURL(img.src)
                resolve(file)
                return
            }

            // 비율 유지하며 축소
            if (width > height) {
                height = Math.round(height * (maxSize / width))
                width = maxSize
            } else {
                width = Math.round(width * (maxSize / height))
                height = maxSize
            }

            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(img, 0, 0, width, height)
            URL.revokeObjectURL(img.src)

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('이미지 리사이즈 실패'))
                        return
                    }
                    const resized = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    })
                    resolve(resized)
                },
                'image/jpeg',
                quality
            )
        }
        img.onerror = () => reject(new Error('이미지 로드 실패'))
        img.src = URL.createObjectURL(file)
    })
}
