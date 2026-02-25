import { useEffect, useRef, useState } from 'react'

interface CreditAnimationState {
  isChanged: boolean
  direction: 'up' | 'down' | null
  prevTotal: number
}

/**
 * 크레딧 변경을 감지하여 애니메이션 상태를 반환하는 훅.
 * 초기 로딩 시에는 애니메이션이 발동하지 않음.
 */
export function useCreditAnimation(sCredit: number, eCredit: number): CreditAnimationState {
  const total = sCredit + eCredit
  const initialized = useRef(false)
  const prevTotal = useRef(total)
  const [state, setState] = useState<CreditAnimationState>({
    isChanged: false,
    direction: null,
    prevTotal: total,
  })

  useEffect(() => {
    // 첫 렌더(초기 로딩)에서는 애니메이션 발동하지 않음
    if (!initialized.current) {
      initialized.current = true
      prevTotal.current = total
      return
    }

    if (total === prevTotal.current) return

    const direction = total > prevTotal.current ? 'up' : 'down'
    const prev = prevTotal.current
    prevTotal.current = total

    setState({ isChanged: true, direction, prevTotal: prev })

    const timer = setTimeout(() => {
      setState({ isChanged: false, direction: null, prevTotal: total })
    }, 2000)

    return () => clearTimeout(timer)
  }, [total])

  return state
}
