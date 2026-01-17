'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { Users, FileText, Package, TrendingUp, Clock, ArrowRight } from 'lucide-react'

interface Stats {
  totalUsers: number
  totalPosts: {
    draft: number
    published: number
    total: number
  }
  totalProducts: number
}

interface RecentUser {
  id: string
  email: string
  displayName: string
  createdAt: string | null
}

interface RecentPost {
  id: string
  title: string
  status: 'draft' | 'published'
  userId: string
  createdAt: string | null
}

export default function AdminDashboardPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/')
    }
  }, [user, isAdmin, authLoading, router])

  useEffect(() => {
    async function fetchStats() {
      if (!user || !isAdmin) return

      try {
        const token = await user.getIdToken()
        const response = await fetch('/api/admin/stats', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const data = await response.json()
        if (data.success) {
          setStats(data.stats)
          setRecentUsers(data.recentUsers)
          setRecentPosts(data.recentPosts)
        } else {
          setError(data.error)
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err)
        setError('통계를 불러오는 데 실패했습니다')
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading && user && isAdmin) {
      fetchStats()
    }
  }, [user, isAdmin, authLoading])

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return null
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
          {error}
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">시스템 현황을 한눈에 확인하세요</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">총 사용자</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats?.totalUsers || 0}</p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">총 블로그 글</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats?.totalPosts.total || 0}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                발행 {stats?.totalPosts.published || 0} / 임시저장 {stats?.totalPosts.draft || 0}
              </p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">총 제품</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats?.totalProducts || 0}</p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
              <Package className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">발행률</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats?.totalPosts.total
                  ? Math.round((stats.totalPosts.published / stats.totalPosts.total) * 100)
                  : 0}
                %
              </p>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 빠른 링크 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Link
          href="/admin/users"
          className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">사용자 관리</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">역할 및 상태 관리</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        </Link>

        <Link
          href="/admin/contents"
          className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-green-300 dark:hover:border-green-600 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">콘텐츠 관리</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">모든 블로그 글 관리</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        </Link>
      </div>

      {/* 최근 활동 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최근 가입 사용자 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">최근 가입 사용자</h2>
          </div>
          {recentUsers.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">가입한 사용자가 없습니다</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentUsers.map((u) => (
                <li key={u.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {u.displayName || u.email}
                    </p>
                    {u.displayName && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(u.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 최근 작성 글 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">최근 작성 글</h2>
          </div>
          {recentPosts.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">작성된 글이 없습니다</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentPosts.map((post) => (
                <li key={post.id} className="py-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {post.title || '(제목 없음)'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        post.status === 'published'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {post.status === 'published' ? '발행' : '임시'}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(post.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
