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
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">API 문서</h3>

          {/* POST /api/publish */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">POST</span>
              <code className="text-sm font-mono text-gray-800 dark:text-gray-200">/api/publish</code>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">블로그 글 등록 (외부 연동용)</p>

            <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              <strong>Headers:</strong>
              <ul className="ml-4 mt-1 space-y-1">
                <li><code>X-API-Key</code>: API 키 (필수)</li>
                <li><code>Content-Type</code>: application/json</li>
              </ul>
            </div>

            <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              <strong>Body:</strong>
              <ul className="ml-4 mt-1 space-y-1">
                <li><code>title</code>: 글 제목 (필수)</li>
                <li><code>content</code>: HTML 내용 (필수)</li>
                <li><code>keywords</code>: 키워드 배열</li>
                <li><code>status</code>: &quot;draft&quot; | &quot;published&quot;</li>
                <li><code>platform</code>: &quot;tistory&quot; | &quot;naver&quot; | &quot;both&quot;</li>
                <li><code>products</code>: 제품 배열 [{`{name, affiliateLink, price?, brand?}`}]</li>
              </ul>
            </div>

            <pre className="px-4 py-3 bg-gray-900 dark:bg-gray-950 rounded-lg text-xs text-gray-100 overflow-x-auto">
{`curl -X POST ${typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}/api/publish \\
  -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "글 제목",
    "content": "<p>HTML 내용</p>",
    "keywords": ["키워드1", "키워드2"],
    "status": "draft",
    "products": [
      {"name": "제품명", "affiliateLink": "https://...", "price": 10000}
    ]
  }'`}
            </pre>
          </div>

          {/* /api/products CRUD */}
          <div className="mb-6 pt-4 border-t border-gray-100 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">/api/products - 제품 관리 API</h4>

            {/* GET */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">GET</span>
                <code className="text-sm font-mono text-gray-800 dark:text-gray-200">/api/products</code>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">제품 목록/단일 조회</p>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                <strong>Query Parameters:</strong>
                <ul className="ml-4 mt-1 space-y-1">
                  <li><code>id</code>: 단일 제품 조회</li>
                  <li><code>keyword</code> 또는 <code>search</code>: 검색어</li>
                  <li><code>category</code>: 카테고리 필터</li>
                  <li><code>minPrice</code>, <code>maxPrice</code>: 가격 범위 필터</li>
                  <li><code>page</code>: 페이지 번호 (기본 1)</li>
                  <li><code>perPage</code> 또는 <code>limit</code>: 페이지당 개수 (기본 20)</li>
                  <li><code>lastId</code>: 커서 기반 페이지네이션 (page 대신 사용)</li>
                </ul>
              </div>
              <pre className="px-4 py-3 bg-gray-900 dark:bg-gray-950 rounded-lg text-xs text-gray-100 overflow-x-auto">
{`# 목록 조회 (페이지 기반)
curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" \\
  "${typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}/api/products?page=1&perPage=20"

# 가격 범위 검색
curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" \\
  "${typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}/api/products?keyword=크림&minPrice=10000&maxPrice=50000"

# 단일 조회
curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" \\
  "${typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}/api/products?id=abc123"`}
              </pre>
            </div>

            {/* POST */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">POST</span>
                <code className="text-sm font-mono text-gray-800 dark:text-gray-200">/api/products</code>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">제품 추가</p>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                <strong>Body:</strong>
                <ul className="ml-4 mt-1 space-y-1">
                  <li><code>name</code>: 제품명 (필수)</li>
                  <li><code>affiliateLink</code>: 제휴 링크 (필수)</li>
                  <li><code>price</code>: 가격</li>
                  <li><code>images</code>: 이미지 URL 배열</li>
                  <li><code>category1</code>, <code>category2</code>, <code>category3</code>: 카테고리</li>
                  <li><code>brand</code>: 브랜드명</li>
                </ul>
              </div>
              <pre className="px-4 py-3 bg-gray-900 dark:bg-gray-950 rounded-lg text-xs text-gray-100 overflow-x-auto">
{`curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  "${typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}/api/products" \\
  -d '{
    "name": "제품명",
    "price": 10000,
    "images": ["https://example.com/img.jpg"],
    "affiliateLink": "https://link.coupang.com/...",
    "category1": "화장품/미용",
    "category2": "스킨케어",
    "category3": "크림",
    "brand": "브랜드명"
  }'`}
              </pre>
            </div>

            {/* PATCH */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">PATCH</span>
                <code className="text-sm font-mono text-gray-800 dark:text-gray-200">/api/products</code>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">제품 수정</p>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                <strong>Body:</strong> <code>id</code> (필수) + 수정할 필드들
              </div>
              <pre className="px-4 py-3 bg-gray-900 dark:bg-gray-950 rounded-lg text-xs text-gray-100 overflow-x-auto">
{`curl -X PATCH -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  "${typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}/api/products" \\
  -d '{"id": "abc123", "price": 15000, "name": "수정된 이름"}'`}
              </pre>
            </div>

            {/* DELETE */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">DELETE</span>
                <code className="text-sm font-mono text-gray-800 dark:text-gray-200">/api/products?id=...</code>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">제품 삭제</p>
              <pre className="px-4 py-3 bg-gray-900 dark:bg-gray-950 rounded-lg text-xs text-gray-100 overflow-x-auto">
{`curl -X DELETE -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" \\
  "${typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}/api/products?id=abc123"`}
              </pre>
            </div>
          </div>

          {/* Response */}
          <div className="mb-6">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              <strong>Response 형식:</strong>
            </div>
            <pre className="px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs text-gray-800 dark:text-gray-200 overflow-x-auto">
{`// 성공 (목록 - 페이지 기반)
{
  "success": true,
  "products": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 27,
    "perPage": 20,
    "totalCount": 522,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "total": 522
}

// 성공 (단일/추가/수정)
{"success": true, "product": {...}, "message": "..."}

// 성공 (삭제)
{"success": true, "message": "제품이 삭제되었습니다"}

// 실패
{"success": false, "error": "에러 메시지"}`}
            </pre>
          </div>

          {/* Firestore 구조 */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Firestore 컬렉션</h4>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono space-y-1">
              <div>📁 blog_posts - 블로그 글</div>
              <div>📁 products - 할당된 제품 (userId_productId)</div>
              <div>📁 naver/_meta/products - 원본 제품</div>
              <div>📁 users - 사용자</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
