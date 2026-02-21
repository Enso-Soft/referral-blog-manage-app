import { useState, useEffect } from 'react'

export type InAppBrowserType = 'kakaotalk' | 'naver' | 'instagram' | 'facebook' | 'line' | 'other' | null

interface InAppBrowserResult {
  isInApp: boolean
  browserType: InAppBrowserType
  isAndroid: boolean
}

export function useInAppBrowser(): InAppBrowserResult {
  const [result, setResult] = useState<InAppBrowserResult>({
    isInApp: false,
    browserType: null,
    isAndroid: false,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const ua = window.navigator.userAgent.toLowerCase()
    const isAndroid = /android/i.test(ua)

    let browserType: InAppBrowserType = null

    if (ua.includes('kakaotalk')) browserType = 'kakaotalk'
    else if (ua.includes('naver')) browserType = 'naver'
    else if (ua.includes('instagram')) browserType = 'instagram'
    else if (ua.includes('fbav') || ua.includes('fban')) browserType = 'facebook'
    else if (ua.includes('line')) browserType = 'line'
    else if (ua.includes('daumapps') || ua.includes('everytime')) browserType = 'other'

    setResult({
      isInApp: browserType !== null,
      browserType,
      isAndroid,
    })
  }, [])

  return result
}
