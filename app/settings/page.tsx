'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { getFirebaseDb } from '@/lib/firebase'
import { useAuth } from '@/components/AuthProvider'
import { Copy, RefreshCw, Check, Key, Loader2, AlertTriangle, X } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const { user, loading: authLoading, getAuthToken } = useAuth()
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

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
    </div>
  )
}
