'use client'

import { useEffect, useRef } from 'react'
import { Coins } from 'lucide-react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useCreditAnimation } from '@/hooks/useCreditAnimation'

interface CreditBalanceCardProps {
  sCredit: number
  eCredit: number
  showPurchaseButton?: boolean
  size?: 'sm' | 'lg'
  onPurchaseClick?: () => void
}

/** 숫자가 부드럽게 카운트업/다운 되는 컴포넌트 */
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const motionValue = useMotionValue(value)
  const display = useTransform(motionValue, (v) => Math.round(v).toLocaleString())
  const ref = useRef<HTMLSpanElement>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      motionValue.set(value)
      return
    }
    const controls = animate(motionValue, value, { duration: 0.6, ease: 'easeOut' })
    return () => controls.stop()
  }, [value, motionValue])

  return <motion.span ref={ref} className={className}>{display}</motion.span>
}

export function CreditBalanceCard({
  sCredit,
  eCredit,
  size = 'sm',
  showPurchaseButton,
  onPurchaseClick,
}: CreditBalanceCardProps) {
  const totalCredit = sCredit + eCredit
  const isLarge = size === 'lg'
  const { isChanged, direction } = useCreditAnimation(sCredit, eCredit)

  return (
    <div className={cn(
      'rounded-xl transition-colors duration-500',
      isLarge
        ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/50 dark:border-amber-800/50 p-6'
        : 'px-4 py-3',
      isChanged && direction === 'up' && 'ring-2 ring-green-400/50',
      isChanged && direction === 'down' && 'ring-2 ring-red-400/50',
    )}>
      {/* Total */}
      <div className={cn('flex items-center gap-2', isLarge ? 'mb-4' : 'mb-2')}>
        <Coins className={cn('text-amber-500', isLarge ? 'w-6 h-6' : 'w-4 h-4')} />
        <motion.span
          className={cn(
            'font-bold',
            isLarge ? 'text-2xl text-foreground' : 'text-lg text-foreground',
            isChanged && direction === 'up' && 'text-green-600 dark:text-green-400',
            isChanged && direction === 'down' && 'text-red-600 dark:text-red-400',
          )}
          animate={isChanged ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 0.4 }}
        >
          <AnimatedNumber value={totalCredit} />
        </motion.span>
        <span className={cn(
          'text-muted-foreground',
          isLarge ? 'text-sm' : 'text-xs'
        )}>
          Credit
        </span>
      </div>

      {/* E / S 분리 */}
      <div className={cn('flex gap-4', isLarge ? 'text-sm' : 'text-xs')}>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-muted-foreground">E&apos;Credit</span>
          <AnimatedNumber value={eCredit} className="font-medium" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-muted-foreground">S&apos;Credit</span>
          <AnimatedNumber value={sCredit} className="font-medium" />
        </div>
      </div>

      {/* 충전 버튼 (선택) */}
      {showPurchaseButton && onPurchaseClick && (
        <button
          onClick={onPurchaseClick}
          className="mt-4 w-full py-2.5 text-sm font-medium rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors"
        >
          E&apos;Credit 충전하기
        </button>
      )}
    </div>
  )
}
