'use client'

import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from 'react'

interface CreditContextType {
  sCredit: number
  eCredit: number
  totalCredit: number
  setSCredit: (v: number) => void
  setECredit: (v: number) => void
  refreshCredits: () => Promise<void>
}

const CreditContext = createContext<CreditContextType>({
  sCredit: 0,
  eCredit: 0,
  totalCredit: 0,
  setSCredit: () => {},
  setECredit: () => {},
  refreshCredits: async () => {},
})

export function CreditProvider({ children }: { children: ReactNode }) {
  const [sCredit, setSCredit] = useState(0)
  const [eCredit, setECredit] = useState(0)

  // onSnapshot이 실시간 반영하므로 수동 refresh는 no-op (하위호환 유지)
  const refreshCredits = useCallback(async () => {}, [])

  const value = useMemo(() => ({
    sCredit, eCredit, totalCredit: sCredit + eCredit, setSCredit, setECredit, refreshCredits,
  }), [sCredit, eCredit, refreshCredits])

  return (
    <CreditContext.Provider value={value}>
      {children}
    </CreditContext.Provider>
  )
}

export function useCredit() {
  return useContext(CreditContext)
}
