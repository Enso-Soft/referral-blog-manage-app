/** 트랜잭션 타입 → 한국어 라벨 */
export const CREDIT_TYPE_LABELS: Record<string, string> = {
  credit: '지급',
  debit: '차감',
}

/** 델타 합계(S+E) → 색상 클래스 */
export function getCreditDeltaColor(delta: number): string {
  if (delta > 0) return 'text-emerald-600 dark:text-emerald-400'
  if (delta < 0) return 'text-red-500 dark:text-red-400'
  return 'text-muted-foreground'
}

/** 숫자 포맷 (+/- 부호 포함) */
export function formatCreditDelta(delta: number): string {
  if (delta > 0) return `+${delta.toLocaleString()}`
  return delta.toLocaleString()
}

/** E/S 델타를 "+1,000 E'Credit" / "-500 S'Credit" 형태로 포맷 (E 우선) */
export function formatCreditDeltaWithLabel(sDelta: number, eDelta: number): string {
  const parts: string[] = []
  if (eDelta !== 0) parts.push(`${formatCreditDelta(eDelta)} E'Credit`)
  if (sDelta !== 0) parts.push(`${formatCreditDelta(sDelta)} S'Credit`)
  return parts.join(' · ') || '0'
}
