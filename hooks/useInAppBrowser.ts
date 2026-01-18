import { useState, useEffect } from 'react'

export function useInAppBrowser() {
    const [isInApp, setIsInApp] = useState(false)

    useEffect(() => {
        if (typeof window === 'undefined') return

        const userAgent = window.navigator.userAgent.toLowerCase()

        // Common in-app browser identifiers in Korea and globally
        const inAppKeywords = [
            'kakaotalk',  // KakaoTalk
            'naver',      // Naver App
            'line',       // LINE
            'fbav',       // Facebook App
            'instagram',  // Instagram
            'daumapps',   // Daum App
            'everytime',  // Everytime
        ]

        const detected = inAppKeywords.some(keyword => userAgent.includes(keyword))
        setIsInApp(detected)
    }, [])

    return isInApp
}
