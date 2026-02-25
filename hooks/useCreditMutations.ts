import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import { useAuth } from '@/components/layout/AuthProvider'
import { queryKeys } from '@/lib/query-client'

export function useCreditMutations() {
  const { authFetch } = useAuthFetch()
  const { refreshCredits } = useAuth()
  const queryClient = useQueryClient()

  const invalidateCredits = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.credits.all })
    refreshCredits()
  }

  // 출석 체크
  const checkin = useMutation({
    mutationFn: async () => {
      const res = await authFetch('/api/credits/checkin', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || '출석 체크 실패')
      }
      return json
    },
    onSuccess: () => invalidateCredits(),
  })

  // 구매 (Lemon Squeezy checkout URL 생성)
  const purchase = useMutation({
    mutationFn: async (variantId: string) => {
      const res = await authFetch('/api/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || '구매 세션 생성 실패')
      }
      return json.data as { checkoutUrl: string }
    },
  })

  return { checkin, purchase, invalidateCredits }
}
