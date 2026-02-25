'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/layout/AuthProvider'
import { useCreditMutations } from '@/hooks/useCreditMutations'
import { CreditBalanceCard } from '@/components/credit/CreditBalanceCard'
import { CreditTransactionList } from '@/components/credit/CreditTransactionList'
import { Loader2, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CreditsPage() {
  const router = useRouter()
  const { user, loading, sCredit, eCredit } = useAuth()
  const { purchase } = useCreditMutations()
  const [typeFilter, setTypeFilter] = useState('')

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
    // TODO: Lemon Squeezy variantId 연동
    purchase.mutate('default', {
      onSuccess: (data) => {
        window.open(data.checkoutUrl, '_blank')
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

      {/* 충전 버튼 */}
      <div className="mt-4">
        <Button
          variant="outline"
          className="w-full h-auto py-3 gap-2"
          onClick={handlePurchase}
          disabled={purchase.isPending}
        >
          {purchase.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <ShoppingBag className="w-5 h-5 text-amber-500" />
          )}
          <span className="text-sm font-medium">E&apos;Credit 충전</span>
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
