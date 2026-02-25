import { useInfiniteQuery } from '@tanstack/react-query'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import { queryKeys } from '@/lib/query-client'

interface CreditTransactionItem {
  id: string
  type: string
  sCreditDelta: number
  eCreditDelta: number
  sCreditAfter: number
  eCreditAfter: number
  description: string
  referenceId: string | null
  referenceType: string | null
  createdAt: string | null
}

interface TransactionsPage {
  data: CreditTransactionItem[]
  pagination: {
    limit: number
    count: number
    lastId: string | null
    hasMore: boolean
  }
}

export function useCreditTransactions(filters?: { type?: string }) {
  const { authFetch } = useAuthFetch()

  return useInfiniteQuery<TransactionsPage>({
    queryKey: queryKeys.credits.transactions(filters?.type),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams()
      params.set('limit', '20')
      if (pageParam) params.set('lastId', pageParam as string)
      if (filters?.type) params.set('type', filters.type)

      const res = await authFetch(`/api/credits/transactions?${params}`)
      if (!res.ok) {
        throw new Error('트랜잭션 조회 실패')
      }
      return res.json()
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.lastId : undefined,
  })
}
