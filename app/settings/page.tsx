'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { getFirebaseDb } from '@/lib/firebase'
import { useAuth } from '@/components/AuthProvider'
import { Copy, RefreshCw, Check, Key, Loader2, AlertTriangle, X, AtSign, Link2, Unlink, Clock, Globe } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const { user, loading: authLoading, getAuthToken } = useAuth()
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  // Threads state
  const [threadsLoading, setThreadsLoading] = useState(true)
  const [threadsConnected, setThreadsConnected] = useState(false)
  const [threadsUsername, setThreadsUsername] = useState<string | null>(null)
  const [threadsExpiresAt, setThreadsExpiresAt] = useState<string | null>(null)
  const [threadsDaysLeft, setThreadsDaysLeft] = useState<number | null>(null)
  const [threadsToken, setThreadsToken] = useState('')
  const [threadsSaving, setThreadsSaving] = useState(false)
  const [threadsRefreshing, setThreadsRefreshing] = useState(false)
  const [threadsError, setThreadsError] = useState('')
  const [showDisconnectModal, setShowDisconnectModal] = useState(false)
  // WordPress state (다중 사이트)
  const [wpLoading, setWpLoading] = useState(true)
  const [wpSites, setWpSites] = useState<{ id: string; siteUrl: string; displayName: string | null }[]>([])
  const [wpInputSiteUrl, setWpInputSiteUrl] = useState('')
  const [wpInputUsername, setWpInputUsername] = useState('')
  const [wpInputAppPassword, setWpInputAppPassword] = useState('')
  const [wpSaving, setWpSaving] = useState(false)
  const [wpError, setWpError] = useState('')
  const [showWpDisconnectModal, setShowWpDisconnectModal] = useState<string | null>(null) // siteId
  const [showWpAddForm, setShowWpAddForm] = useState(false)
  // WordPress URL 실시간 감지
  const [wpDetecting, setWpDetecting] = useState(false)
  const [wpDetected, setWpDetected] = useState<boolean | null>(null)
  const [wpSiteName, setWpSiteName] = useState<string | null>(null)
  const [wpDetectError, setWpDetectError] = useState('')
  const [wpNormalizedUrl, setWpNormalizedUrl] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push('/auth/login')
      return
    }

    // Fetch API key from Firestore
    const fetchApiKey = async () => {
      try {
        const userDoc = await getDoc(doc(getFirebaseDb(), 'users', user.uid))
        if (userDoc.exists()) {
          setApiKey(userDoc.data().apiKey || null)
        }
      } catch (error) {
        console.error('Failed to fetch API key:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchApiKey()

    // Fetch Threads status
    const fetchThreadsStatus = async () => {
      try {
        const token = await getAuthToken()
        const res = await fetch('/api/settings/threads-token', {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        const data = await res.json()
        if (data.success && data.data) {
          setThreadsConnected(data.data.connected)
          setThreadsUsername(data.data.username || null)
          setThreadsExpiresAt(data.data.expiresAt || null)
          setThreadsDaysLeft(data.data.daysLeft ?? null)
        }
      } catch (error) {
        console.error('Failed to fetch Threads status:', error)
      } finally {
        setThreadsLoading(false)
      }
    }

    fetchThreadsStatus()

    // Fetch WordPress sites
    const fetchWpStatus = async () => {
      try {
        const token = await getAuthToken()
        const res = await fetch('/api/settings/wordpress', {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        const data = await res.json()
        if (data.success && data.data?.sites) {
          setWpSites(data.data.sites)
        }
      } catch (error) {
        console.error('Failed to fetch WordPress status:', error)
      } finally {
        setWpLoading(false)
      }
    }

    fetchWpStatus()
  }, [user, authLoading, router, getAuthToken])

  // WordPress URL 실시간 감지 (debounce 800ms)
  useEffect(() => {
    const url = wpInputSiteUrl.trim()

    if (!url || !url.includes('.')) {
      setWpDetected(null)
      setWpSiteName(null)
      setWpDetectError('')
      setWpNormalizedUrl(null)
      return
    }

    // 이미 감지 완료된 정규화 URL과 동일하면 재검증 스킵
    if (wpDetected === true && wpNormalizedUrl === url) {
      return
    }

    setWpDetecting(true)
    setWpDetected(null)
    setWpDetectError('')

    const timer = setTimeout(async () => {
      try {
        const token = await getAuthToken()
        const res = await fetch('/api/wordpress/detect', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url }),
        })
        const data = await res.json()
        if (data.success && data.data) {
          setWpDetected(data.data.isWordPress)
          setWpSiteName(data.data.isWordPress ? data.data.siteName : null)
          setWpNormalizedUrl(data.data.isWordPress ? data.data.siteUrl : null)
          if (!data.data.isWordPress) {
            setWpDetectError(data.data.error || 'WordPress 사이트가 아닙니다.')
          }
        }
      } catch {
        setWpDetected(false)
        setWpDetectError('연결 확인에 실패했습니다.')
      } finally {
        setWpDetecting(false)
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [wpInputSiteUrl, getAuthToken])

  const handleCopy = async () => {
    if (!apiKey) return
    await navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRegenerate = useCallback(async () => {
    setShowConfirmModal(false)
    setRegenerating(true)
    try {
      const token = await getAuthToken()
      const res = await fetch('/api/settings/api-key', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await res.json()
      if (data.success) {
        setApiKey(data.apiKey)
      } else {
        alert('API 키 재발급에 실패했습니다')
      }
    } catch (error) {
      console.error('Failed to regenerate API key:', error)
      alert('API 키 재발급에 실패했습니다')
    } finally {
      setRegenerating(false)
    }
  }, [getAuthToken])

  const handleThreadsSave = useCallback(async () => {
    if (!threadsToken.trim()) return
    setThreadsSaving(true)
    setThreadsError('')
    try {
      const token = await getAuthToken()
      const res = await fetch('/api/settings/threads-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken: threadsToken.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setThreadsConnected(true)
        setThreadsUsername(data.data.username)
        setThreadsToken('')
        setThreadsDaysLeft(60)
        setThreadsExpiresAt(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString())
      } else {
        setThreadsError(data.error || '연결에 실패했습니다')
      }
    } catch {
      setThreadsError('연결에 실패했습니다')
    } finally {
      setThreadsSaving(false)
    }
  }, [threadsToken, getAuthToken])

  const handleThreadsDisconnect = useCallback(async () => {
    setShowDisconnectModal(false)
    try {
      const token = await getAuthToken()
      await fetch('/api/settings/threads-token', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      setThreadsConnected(false)
      setThreadsUsername(null)
      setThreadsExpiresAt(null)
      setThreadsDaysLeft(null)
    } catch {
      alert('연결 해제에 실패했습니다')
    }
  }, [getAuthToken])

  const handleThreadsRefresh = useCallback(async () => {
    setThreadsRefreshing(true)
    try {
      const token = await getAuthToken()
      const res = await fetch('/api/settings/threads-token', {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setThreadsExpiresAt(data.data.expiresAt)
        setThreadsDaysLeft(data.data.daysLeft)
      } else {
        alert(data.error || '토큰 갱신에 실패했습니다')
      }
    } catch {
      alert('토큰 갱신에 실패했습니다')
    } finally {
      setThreadsRefreshing(false)
    }
  }, [getAuthToken])

  const handleWpSave = useCallback(async () => {
    if (!wpInputSiteUrl.trim() || !wpInputUsername.trim() || !wpInputAppPassword.trim()) return
    // blur 전에 연결 눌렀을 때도 정규화된 URL 적용
    const siteUrl = wpNormalizedUrl && wpDetected === true ? wpNormalizedUrl : wpInputSiteUrl.trim()
    if (wpNormalizedUrl && wpDetected === true) {
      setWpInputSiteUrl(wpNormalizedUrl)
    }
    setWpSaving(true)
    setWpError('')
    try {
      const token = await getAuthToken()
      const res = await fetch('/api/settings/wordpress', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteUrl,
          username: wpInputUsername.trim(),
          appPassword: wpInputAppPassword.trim(),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setWpSites(prev => [...prev, {
          id: data.data.id,
          siteUrl: data.data.siteUrl,
          displayName: data.data.displayName,
        }])
        setWpInputSiteUrl('')
        setWpInputUsername('')
        setWpInputAppPassword('')
        setShowWpAddForm(false)
        setWpDetected(null)
        setWpSiteName(null)
        setWpNormalizedUrl(null)
      } else {
        setWpError(data.error || '연결에 실패했습니다')
      }
    } catch {
      setWpError('연결에 실패했습니다')
    } finally {
      setWpSaving(false)
    }
  }, [wpInputSiteUrl, wpInputUsername, wpInputAppPassword, wpNormalizedUrl, wpDetected, getAuthToken])

  const handleWpDisconnect = useCallback(async (siteId: string) => {
    setShowWpDisconnectModal(null)
    try {
      const token = await getAuthToken()
      await fetch(`/api/settings/wordpress?siteId=${siteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      setWpSites(prev => prev.filter(s => s.id !== siteId))
    } catch {
      alert('연결 해제에 실패했습니다')
    }
  }, [getAuthToken])

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">설정</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">API 키</h2>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          AI 글 작성 등 외부 연동에 사용되는 키입니다. 회원가입 시 자동으로 발급됩니다.
        </p>

        {apiKey ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <code className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg font-mono text-sm text-gray-800 dark:text-gray-200 break-all">
                {apiKey}
              </code>
              <button
                onClick={handleCopy}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="복사"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* 재발급 안내 */}
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                API 키가 외부에 노출된 경우에만 재발급해 주세요.
                재발급 시 기존 키는 즉시 무효화되며, AI 글 작성이 진행 중인 경우 진행 상태가 누락될 수 있습니다.
              </p>
            </div>

            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={regenerating}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
              {regenerating ? '재발급 중...' : 'API 키 재발급'}
            </button>
          </div>
        ) : (
          <div className="text-gray-500 dark:text-gray-400">
            API 키가 없습니다. 재발급 버튼을 눌러 생성하세요.
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={regenerating}
              className="mt-4 flex items-center gap-2 px-4 py-2 text-sm text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <Key className="w-4 h-4" />
              {regenerating ? '발급 중...' : 'API 키 발급'}
            </button>
          </div>
        )}
      </div>

      {/* Threads 연동 카드 */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <AtSign className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Threads 연동</h2>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Threads 계정을 연결하면 블로그 글을 Threads에 자동으로 포스팅할 수 있습니다.
        </p>

        {threadsLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            불러오는 중...
          </div>
        ) : threadsConnected ? (
          <div className="space-y-4">
            {/* 연결 상태 */}
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <Link2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  @{threadsUsername} 연결됨
                </p>
                {threadsDaysLeft !== null && (
                  <p className="text-xs text-green-600 dark:text-green-500">
                    토큰 만료까지 {threadsDaysLeft}일
                  </p>
                )}
              </div>
            </div>

            {/* 만료 임박 경고 */}
            {threadsDaysLeft !== null && threadsDaysLeft <= 7 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    토큰이 곧 만료됩니다. 갱신해 주세요.
                  </p>
                </div>
              </div>
            )}

            {/* 버튼 */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleThreadsRefresh}
                disabled={threadsRefreshing}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${threadsRefreshing ? 'animate-spin' : ''}`} />
                {threadsRefreshing ? '갱신 중...' : '토큰 갱신'}
              </button>
              <button
                onClick={() => setShowDisconnectModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Unlink className="w-4 h-4" />
                연결 해제
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Meta Threads API에서 발급받은 장기 Access Token을 입력하세요.
                토큰은 암호화되어 저장되며, Threads 포스팅에만 사용됩니다.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="password"
                value={threadsToken}
                onChange={(e) => {
                  setThreadsToken(e.target.value)
                  setThreadsError('')
                }}
                placeholder="Threads Access Token"
                className="flex-1 px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleThreadsSave}
                disabled={threadsSaving || !threadsToken.trim()}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {threadsSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4" />
                )}
                {threadsSaving ? '연결 중...' : '연결'}
              </button>
            </div>

            {threadsError && (
              <p className="text-sm text-red-500">{threadsError}</p>
            )}
          </div>
        )}
      </div>

      {/* WordPress 연동 카드 */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">WordPress 연동</h2>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          WordPress 사이트를 연결하면 블로그 글을 WordPress에 자동으로 발행할 수 있습니다. 여러 사이트를 연결할 수 있습니다.
        </p>

        {wpLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            불러오는 중...
          </div>
        ) : (
          <div className="space-y-4">
            {/* 연결된 사이트 목록 */}
            {wpSites.map((site) => (
              <div key={site.id} className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <Link2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400 truncate">
                    {site.displayName || 'WordPress'}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500 truncate">
                    {site.siteUrl}
                  </p>
                </div>
                <button
                  onClick={() => setShowWpDisconnectModal(site.id)}
                  className="p-1.5 text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                  title="연결 해제"
                >
                  <Unlink className="w-4 h-4" />
                </button>
              </div>
            ))}

            {/* 사이트 추가 폼 */}
            {(showWpAddForm || wpSites.length === 0) ? (
              <div className="space-y-4">
                {wpSites.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      WordPress 사이트 추가
                    </p>
                  </div>
                )}

                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    WordPress 사이트의 URL, 사용자명, Application Password를 입력하세요.
                    Application Password는 WordPress 대시보드의 사용자 &rarr; 프로필에서 생성할 수 있습니다.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="relative">
                      <input
                        type="text"
                        value={wpInputSiteUrl}
                        onChange={(e) => { setWpInputSiteUrl(e.target.value); setWpError('') }}
                        onBlur={() => {
                          if (wpNormalizedUrl && wpDetected === true) {
                            setWpInputSiteUrl(wpNormalizedUrl)
                          }
                        }}
                        placeholder="https://your-wordpress-site.com"
                        className={`w-full px-4 py-2.5 pr-10 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          wpDetected === true ? 'border-green-500 dark:border-green-500' :
                          wpDetected === false ? 'border-red-400 dark:border-red-500' :
                          'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {wpDetecting && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                        {!wpDetecting && wpDetected === true && <Check className="w-4 h-4 text-green-500" />}
                        {!wpDetecting && wpDetected === false && <AlertTriangle className="w-4 h-4 text-red-400" />}
                      </div>
                    </div>
                    {wpDetected === true && wpSiteName && (
                      <p className="mt-1.5 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        WordPress 감지됨 &mdash; {wpSiteName}
                      </p>
                    )}
                    {wpDetected === false && wpDetectError && (
                      <p className="mt-1.5 text-xs text-red-500">{wpDetectError}</p>
                    )}
                  </div>
                  <input
                    type="text"
                    value={wpInputUsername}
                    onChange={(e) => { setWpInputUsername(e.target.value); setWpError('') }}
                    placeholder="WordPress 사용자명"
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="password"
                    value={wpInputAppPassword}
                    onChange={(e) => { setWpInputAppPassword(e.target.value); setWpError('') }}
                    placeholder="Application Password"
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleWpSave}
                    disabled={wpSaving || !wpInputSiteUrl.trim() || !wpInputUsername.trim() || !wpInputAppPassword.trim()}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    {wpSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Link2 className="w-4 h-4" />
                    )}
                    {wpSaving ? '연결 중...' : '연결'}
                  </button>
                  {wpSites.length > 0 && (
                    <button
                      onClick={() => {
                        setShowWpAddForm(false)
                        setWpInputSiteUrl('')
                        setWpInputUsername('')
                        setWpInputAppPassword('')
                        setWpError('')
                        setWpDetected(null)
                        setWpSiteName(null)
                        setWpNormalizedUrl(null)
                      }}
                      className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      취소
                    </button>
                  )}
                </div>

                {wpError && (
                  <p className="text-sm text-red-500">{wpError}</p>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowWpAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Globe className="w-4 h-4" />
                WordPress 사이트 추가
              </button>
            )}
          </div>
        )}
      </div>

      {/* 재발급 확인 모달 */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowConfirmModal(false)}
          />
          <div className="relative w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                API 키 재발급
              </h3>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                정말 API 키를 재발급하시겠습니까?
              </p>
              <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">&#8226;</span>
                  기존 키는 즉시 무효화되며 복구할 수 없습니다.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">&#8226;</span>
                  AI 글 작성이 진행 중인 경우 진행 상태가 누락될 수 있습니다.
                </li>
              </ul>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleRegenerate}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              >
                재발급
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Threads 연결 해제 확인 모달 */}
      {showDisconnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDisconnectModal(false)}
          />
          <div className="relative w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
            <button
              onClick={() => setShowDisconnectModal(false)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <Unlink className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Threads 연결 해제
              </h3>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              Threads 연결을 해제하면 더 이상 자동 포스팅이 불가능합니다. 계속하시겠습니까?
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDisconnectModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleThreadsDisconnect}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              >
                연결 해제
              </button>
            </div>
          </div>
        </div>
      )}
      {/* WordPress 연결 해제 확인 모달 */}
      {showWpDisconnectModal && (() => {
        const targetSite = wpSites.find(s => s.id === showWpDisconnectModal)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowWpDisconnectModal(null)}
            />
            <div className="relative w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
              <button
                onClick={() => setShowWpDisconnectModal(null)}
                className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                  <Unlink className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  WordPress 연결 해제
                </h3>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                {targetSite?.displayName || targetSite?.siteUrl || 'WordPress'} 연결을 해제하시겠습니까?
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                이 사이트로 발행된 기존 글에는 영향이 없지만, 더 이상 이 사이트로 발행할 수 없게 됩니다.
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowWpDisconnectModal(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={() => handleWpDisconnect(showWpDisconnectModal)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                >
                  연결 해제
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
