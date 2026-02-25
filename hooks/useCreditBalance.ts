import { useQuery } from '@tanstack/react-query'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import { queryKeys } from '@/lib/query-client'

interface CreditBalance {
  sCredit: number
  eCredit: number
  totalCredit: number
  lastCheckIn: string | null
}

export function useCreditBalance(enabled = true) {
  const { authFetch } = useAuthFetch()

  return useQuery({
    queryKey: queryKeys.credits.balance(),
    queryFn: async (): Promise<CreditBalance> => {
      const res = await authFetch('/api/credits/balance')
      if (!res.ok) {
        throw new Error('크레딧 잔액 조회 실패')
      }
      const json = await res.json()
      return json.data
    },
    enabled,
    staleTime: 30 * 1000, // 30초
  })
}
