'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useCreditTransactions } from '@/hooks/useCreditTransactions'
import {
  getCreditDeltaColor,
  formatCreditDeltaWithLabel,
} from './credit-utils'
import { Loader2, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CreditTransactionListProps {
  limit?: number
  showFilter?: boolean
  showLoadMore?: boolean
  compact?: boolean
  typeFilter?: string
  onTypeFilterChange?: (type: string) => void
  emptyMessage?: string
}

export function CreditTransactionList({
  limit,
  showFilter,
  showLoadMore,
  compact,
  typeFilter,
  onTypeFilterChange,
  emptyMessage = '크레딧 내역이 없습니다.',
}: CreditTransactionListProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useCreditTransactions()

  const transactions = useMemo(() => {
    const all = data?.pages.flatMap((p) => p.data) ?? []
    const filtered = typeFilter
      ? all.filter((tx) => {
          const delta = tx.sCreditDelta + tx.eCreditDelta
          return typeFilter === 'credit' ? delta > 0 : delta < 0
        })
      : all
    return limit ? filtered.slice(0, limit) : filtered
  }, [data, limit, typeFilter])

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      {/* 타입 필터 */}
      {showFilter && onTypeFilterChange && (
        <div className="mb-4">
          <select
            value={typeFilter ?? ''}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            className="w-full sm:w-48 text-sm rounded-lg border border-border bg-background px-3 py-2"
          >
            <option value="">전체</option>
            <option value="credit">지급</option>
            <option value="debit">사용</option>
          </select>
        </div>
      )}

      {/* 목록 */}
      {transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">{emptyMessage}</p>
      ) : (
        <div className={cn('divide-y divide-border/50', compact && 'divide-y-0 space-y-1')}>
          {transactions.map((tx) => {
            const totalDelta = tx.sCreditDelta + tx.eCreditDelta
            const isPositive = totalDelta >= 0

            if (compact) {
              return (
                <div key={tx.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {isPositive
                      ? <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      : <ArrowUpRight className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                    }
                    <span className="text-sm truncate">{tx.description}</span>
                  </div>
                  <span className={cn('text-sm font-medium tabular-nums flex-shrink-0 ml-2', getCreditDeltaColor(totalDelta))}>
                    {formatCreditDeltaWithLabel(tx.sCreditDelta, tx.eCreditDelta)}
                  </span>
                </div>
              )
            }

            return (
              <div key={tx.id} className="flex items-start gap-3 py-3">
                <div className={cn(
                  'mt-0.5 p-1.5 rounded-lg',
                  isPositive ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'
                )}>
                  {isPositive
                    ? <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    : <ArrowUpRight className="w-4 h-4 text-red-500 dark:text-red-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                    <span className={cn('text-sm font-semibold tabular-nums flex-shrink-0', getCreditDeltaColor(totalDelta))}>
                      {formatCreditDeltaWithLabel(tx.sCreditDelta, tx.eCreditDelta)}
                    </span>
                  </div>
                  {tx.createdAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTime(tx.createdAt)}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 더 보기 */}
      {showLoadMore && hasNextPage && (
        <div className="pt-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : null}
            더 보기
          </Button>
        </div>
      )}
    </div>
  )
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '방금'
  if (minutes < 60) return `${minutes}분 전`
  if (hours < 24) return `${hours}시간 전`
  if (days < 7) return `${days}일 전`
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}
