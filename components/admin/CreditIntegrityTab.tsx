'use client'

import { useState } from 'react'
import { Loader2, Search, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import { cn } from '@/lib/utils'

interface IntegrityResult {
  userId: string
  isValid: boolean
  stored: { sCredit: number; eCredit: number }
  calculated: { sCredit: number; eCredit: number }
  transactionCount: number
}

export function CreditIntegrityTab() {
  const { authFetch } = useAuthFetch()
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<IntegrityResult | null>(null)
  const [error, setError] = useState('')

  const handleCheck = async () => {
    if (!userId.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await authFetch(`/api/admin/credits/integrity?userId=${encodeURIComponent(userId.trim())}`)
      const json = await res.json()
      if (json.success) {
        setResult(json.data)
      } else {
        setError(json.error || '검증 실패')
      }
    } catch {
      setError('요청 중 오류 발생')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* 검색 */}
      <div className="flex gap-2 mb-6">
        <Input
          placeholder="userId를 입력하세요"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
          className="max-w-sm"
        />
        <Button onClick={handleCheck} disabled={loading || !userId.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Search className="w-4 h-4 mr-1" />}
          검증
        </Button>
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {/* 결과 */}
      {result && (
        <div className={cn(
          'rounded-xl border p-6',
          result.isValid
            ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30'
            : 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30'
        )}>
          {/* 상태 */}
          <div className="flex items-center gap-2 mb-4">
            {result.isValid ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">잔액 일치</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span className="font-semibold text-red-700 dark:text-red-300">잔액 불일치</span>
              </>
            )}
          </div>

          {/* 비교 테이블 */}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium" />
                  <th className="text-right px-4 py-2 font-medium">E&apos;Credit</th>
                  <th className="text-right px-4 py-2 font-medium">S&apos;Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="px-4 py-2 font-medium">저장값 (Stored)</td>
                  <td className="text-right px-4 py-2 tabular-nums">{result.stored.eCredit.toLocaleString()}</td>
                  <td className="text-right px-4 py-2 tabular-nums">{result.stored.sCredit.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">계산값 (Calculated)</td>
                  <td className="text-right px-4 py-2 tabular-nums">{result.calculated.eCredit.toLocaleString()}</td>
                  <td className="text-right px-4 py-2 tabular-nums">{result.calculated.sCredit.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            총 {result.transactionCount}건의 트랜잭션 기준으로 검증
          </p>
        </div>
      )}
    </div>
  )
}
