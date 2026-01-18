'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { getFirebaseDb } from '@/lib/firebase'
import { useAuth } from '@/components/AuthProvider'
import { Copy, RefreshCw, Check, Key, Loader2 } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const { user, loading: authLoading, getAuthToken } = useAuth()
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [copied, setCopied] = useState(false)

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
  }, [user, authLoading, router])

  const handleCopy = async () => {
    if (!apiKey) return
    await navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRegenerate = async () => {
    if (!confirm('API 키를 재발급하면 기존 키는 사용할 수 없습니다. 계속하시겠습니까?')) {
      return
    }

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
  }

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
          이 API 키를 사용하여 외부에서 블로그 글을 등록할 수 있습니다.
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

            <button
              onClick={handleRegenerate}
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
              onClick={handleRegenerate}
              disabled={regenerating}
              className="mt-4 flex items-center gap-2 px-4 py-2 text-sm text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <Key className="w-4 h-4" />
              {regenerating ? '발급 중...' : 'API 키 발급'}
            </button>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">API 요약</h3>

          {/* API 문서 엔드포인트 안내 */}
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <code className="text-sm font-mono font-semibold text-blue-800 dark:text-blue-200">/api/docs</code>
              <span className="text-sm text-blue-600 dark:text-blue-300">- API Documentation Endpoint</span>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
              상세 API 문서를 Markdown 형식으로 반환합니다. 각 엔드포인트의 파라미터, 요청/응답 예시, curl 명령어를 확인할 수 있습니다.
            </p>
            <div className="space-y-2 text-xs text-blue-600 dark:text-blue-400 mb-3">
              <div><code className="bg-blue-100 dark:bg-blue-800 px-1.5 py-0.5 rounded">GET /api/docs</code> - 전체 API 문서</div>
              <div><code className="bg-blue-100 dark:bg-blue-800 px-1.5 py-0.5 rounded">GET /api/docs?resource=publish</code> - Publish API만</div>
              <div><code className="bg-blue-100 dark:bg-blue-800 px-1.5 py-0.5 rounded">GET /api/docs?resource=products</code> - Products API만</div>
            </div>
            <pre className="px-3 py-2 bg-gray-900 dark:bg-gray-950 rounded text-xs text-gray-100 overflow-x-auto">
{`curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" \\
  "${typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}/api/docs"`}
            </pre>
          </div>

          {/* API 요약 목록 */}
          <div className="space-y-3">
            {/* /api/publish */}
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <code className="text-sm font-mono font-medium text-gray-800 dark:text-gray-200">/api/publish</code>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">블로그 글 CRUD (POST/GET/PATCH/DELETE)</p>
              <pre className="mt-2 px-3 py-2 bg-gray-900 dark:bg-gray-950 rounded text-xs text-gray-100 overflow-x-auto">
{`curl -X POST ${typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}/api/publish \\
  -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{"title": "제목", "content": "<p>내용</p>"}'`}
              </pre>
            </div>

            {/* /api/products */}
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <code className="text-sm font-mono font-medium text-gray-800 dark:text-gray-200">/api/products</code>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">제품 CRUD (POST/GET/PATCH/DELETE)</p>
              <pre className="mt-2 px-3 py-2 bg-gray-900 dark:bg-gray-950 rounded text-xs text-gray-100 overflow-x-auto">
{`curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" \\
  "${typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}/api/products?page=1&limit=20"`}
              </pre>
            </div>

          </div>

          {/* 인증 안내 */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              모든 API는 <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">X-API-Key</code> 헤더로 인증합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
