'use client'

import Link from 'next/link'
import { Coins } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCredit } from '@/context/CreditContext'
import { useCreditAnimation } from '@/hooks/useCreditAnimation'
import { CreditBalanceCard } from './CreditBalanceCard'
import { CreditTransactionList } from './CreditTransactionList'
import { cn } from '@/lib/utils'

export function CreditPopover() {
  const { sCredit, eCredit, totalCredit } = useCredit()
  const { isChanged, direction } = useCreditAnimation(sCredit, eCredit)

  return (
    <div className="relative group">
      {/* 트리거 */}
      <Link
        href="/credits"
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-secondary/80 transition-colors"
      >
        <Coins className="w-4 h-4 text-amber-500" />
        <motion.span
          className={cn(
            'transition-colors duration-500',
            isChanged && direction === 'up' && 'text-green-600 dark:text-green-400',
            isChanged && direction === 'down' && 'text-red-600 dark:text-red-400',
          )}
          animate={isChanged ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          {totalCredit.toLocaleString()} Credit
        </motion.span>
      </Link>

      {/* Popover (hover 시 표시) */}
      <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border/40 bg-popover/80 backdrop-blur-lg shadow-lg opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all transform origin-top-right scale-95 group-hover:scale-100 z-50">
        {/* 잔액 */}
        <CreditBalanceCardInner />

        {/* 최근 5건 */}
        <div className="border-t px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">최근 내역</p>
          <CreditTransactionList limit={5} compact showLoadMore={false} showFilter={false} />
        </div>

        {/* 충전 링크 */}
        <div className="border-t p-3">
          <Link
            href="/credits"
            className="block w-full text-center text-sm font-medium py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors"
          >
            E&apos;Credit 충전하기
          </Link>
        </div>
      </div>
    </div>
  )
}

/** Popover 내부 잔액 표시 — useCredit에서 직접 읽음 */
function CreditBalanceCardInner() {
  const { sCredit, eCredit } = useCredit()
  return <CreditBalanceCard sCredit={sCredit} eCredit={eCredit} size="sm" />
}
