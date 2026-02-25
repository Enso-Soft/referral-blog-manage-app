'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

/**
 * 404 Not Found 페이지
 * Next.js App Router의 not-found.tsx 규칙을 따릅니다.
 */
export default function NotFound() {
  const router = useRouter()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md text-center">
        <div className="mb-6">
          <span className="text-8xl font-bold text-gray-300 dark:text-gray-700">
            404
          </span>
        </div>

        <h1 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-gray-200">
          페이지를 찾을 수 없습니다
        </h1>

        <p className="mb-6 text-gray-600 dark:text-gray-400">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            홈으로 이동
          </Link>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="px-6 py-3"
          >
            이전 페이지
          </Button>
        </div>
      </div>
    </div>
  )
}
