'use client'

import { useState, useCallback } from 'react'
import { Loader2, Search, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import {
  CREDIT_TYPE_LABELS,
  getCreditDeltaColor,
  formatCreditDeltaWithLabel,
} from '@/components/credit/credit-utils'

interface AdminTransaction {
  id: string
  userId: string
  type: string
  sCreditDelta: number
  eCreditDelta: number
  sCreditAfter: number
  eCreditAfter: number
  description: string
  adminUserId: string | null
  createdAt: string | null
}

export function CreditTransactionsTab() {
  const { authFetch } = useAuthFetch()
  const [userId, setUserId] = useState('')
  const [type, setType] = useState('')
  const [transactions, setTransactions] = useState<AdminTransaction[]>([])
  const [loading, setLoading] = useState(false)
  const [lastId, setLastId] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const search = useCallback(async (append = false) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', '30')
      if (userId.trim()) params.set('userId', userId.trim())
      if (type) params.set('type', type)
      if (append && lastId) params.set('lastId', lastId)

      const res = await authFetch(`/api/admin/credits/transactions?${params}`)
      const json = await res.json()
      if (json.success) {
        setTransactions((prev) => append ? [...prev, ...json.data] : json.data)
        setLastId(json.pagination.lastId)
        setHasMore(json.pagination.hasMore)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [authFetch, userId, type, lastId])

  const handleSearch = () => {
    setLastId(null)
    search(false)
  }

  return (
    <div>
      {/* 필터 */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Input
          placeholder="userId"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="sm:w-64"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="text-sm rounded-lg border border-border bg-background px-3 py-2 sm:w-40"
        >
          <option value="">전체 타입</option>
          {Object.entries(CREDIT_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <Button onClick={handleSearch} disabled={loading}>
          <Search className="w-4 h-4 mr-1" />
          조회
        </Button>
      </div>

      {/* 결과 */}
      {loading && transactions.length === 0 ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">조회 버튼을 누르거나 결과가 없습니다</p>
      ) : (
        <div className="space-y-1">
          {transactions.map((tx) => {
            const totalDelta = tx.sCreditDelta + tx.eCreditDelta
            const isPositive = totalDelta >= 0
            return (
              <div key={tx.id} className="flex items-start gap-3 py-2.5 border-b border-border/50">
                <div className={`mt-0.5 p-1.5 rounded-lg ${isPositive ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                  {isPositive
                    ? <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    : <ArrowUpRight className="w-4 h-4 text-red-500 dark:text-red-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                    <span className={`text-sm font-semibold tabular-nums flex-shrink-0 ${getCreditDeltaColor(totalDelta)}`}>
                      {formatCreditDeltaWithLabel(tx.sCreditDelta, tx.eCreditDelta)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                      {CREDIT_TYPE_LABELS[tx.type] ?? tx.type}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">{tx.userId}</span>
                    {tx.createdAt && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleString('ko-KR')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {hasMore && (
            <div className="pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => search(true)}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                더 보기
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
