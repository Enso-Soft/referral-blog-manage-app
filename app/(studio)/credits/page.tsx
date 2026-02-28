'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/layout/AuthProvider'
import { useCredit } from '@/context/CreditContext'
import { useCreditMutations } from '@/hooks/useCreditMutations'
import { CreditBalanceCard } from '@/components/credit/CreditBalanceCard'
import { CreditTransactionList } from '@/components/credit/CreditTransactionList'
import { Loader2, Zap, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CreditsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { sCredit, eCredit } = useCredit()
  const { purchase } = useCreditMutations()
  const [typeFilter, setTypeFilter] = useState('')
  const [creditPerWon, setCreditPerWon] = useState(5)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/credits/config')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data.creditPerWon) {
          setCreditPerWon(json.data.creditPerWon)
        }
      })
      .catch(() => {})
  }, [])

  // 인증 가드
  if (!loading && !user) {
    router.replace('/auth/login')
    return null
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const handlePurchase = () => {
    setError('')
    purchase.mutate(undefined, {
      onSuccess: (data) => {
        window.location.href = data.checkoutUrl
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : '충전 세션 생성에 실패했습니다')
      },
    })
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">크레딧</h1>

      {/* 잔액 카드 */}
      <CreditBalanceCard
        sCredit={sCredit}
        eCredit={eCredit}
        size="lg"
      />

      {/* E'Credit 충전 카드 */}
      <div className="mt-4 rounded-xl border border-violet-200/50 dark:border-violet-800/50 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 p-6">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-violet-500" />
          <h2 className="text-lg font-semibold">E&apos;Credit 충전</h2>
        </div>

        <div className="mb-2 text-2xl font-bold text-violet-600 dark:text-violet-400">
          ₩1,000 = {(1000 * creditPerWon).toLocaleString()} E&apos;Credit
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          원하는 금액만큼 자유롭게 충전할 수 있습니다
        </p>

        {error && (
          <p className="text-sm text-red-500 mb-3">{error}</p>
        )}

        <Button
          className="w-full h-auto py-3 gap-2 bg-violet-600 hover:bg-violet-700 text-white"
          onClick={handlePurchase}
          disabled={purchase.isPending}
        >
          {purchase.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <CreditCard className="w-5 h-5" />
          )}
          <span className="font-medium">충전하기</span>
        </Button>
      </div>

      {/* 트랜잭션 이력 */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">크레딧 내역</h2>
        <CreditTransactionList
          showFilter
          showLoadMore
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
        />
      </div>
    </div>
  )
}
