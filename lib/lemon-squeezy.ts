import 'server-only'
import { createHmac, timingSafeEqual } from 'crypto'
import { getCreditSettings } from '@/lib/credit-operations'

const LEMON_SQUEEZY_API_URL = 'https://api.lemonsqueezy.com/v1'

function getApiKey(): string {
  const key = process.env.LEMON_SQUEEZY_API_KEY
  if (!key) throw new Error('LEMON_SQUEEZY_API_KEY 환경변수가 설정되지 않았습니다')
  return key
}

function getWebhookSecret(): string {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET
  if (!secret) throw new Error('LEMON_SQUEEZY_WEBHOOK_SECRET 환경변수가 설정되지 않았습니다')
  return secret
}

function getStoreId(): string {
  const id = process.env.LEMON_SQUEEZY_STORE_ID
  if (!id) throw new Error('LEMON_SQUEEZY_STORE_ID 환경변수가 설정되지 않았습니다')
  return id
}

/**
 * Lemon Squeezy 체크아웃 세션 생성
 * @returns checkout URL
 */
export async function createCheckoutSession(
  userId: string,
  variantId: string,
  origin: string
): Promise<string> {
  const apiKey = getApiKey()
  const storeId = getStoreId()
  const creditSettings = await getCreditSettings()
  const rate = creditSettings.creditPerWon

  const response = await fetch(`${LEMON_SQUEEZY_API_URL}/checkouts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/vnd.api+json',
      'Accept': 'application/vnd.api+json',
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          product_options: {
            redirect_url: `${origin}/credits`,
            description: `₩1,000 = ${(1000 * rate).toLocaleString()} E'Credit`,
          },
          checkout_data: {
            custom: {
              user_id: userId,
            },
          },
        },
        relationships: {
          store: {
            data: { type: 'stores', id: storeId },
          },
          variant: {
            data: { type: 'variants', id: variantId },
          },
        },
      },
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Lemon Squeezy API 에러 (${response.status}): ${errorBody}`)
  }

  const result = await response.json()
  const checkoutUrl = result.data?.attributes?.url

  if (!checkoutUrl) {
    throw new Error('체크아웃 URL을 받지 못했습니다')
  }

  return checkoutUrl
}

export interface VerifiedOrder {
  valid: boolean
  status?: string
  refunded?: boolean
  total?: number
  userEmail?: string
}

/**
 * Lemon Squeezy API로 주문 검증 (실존 + store_id + 상태)
 */
export async function verifyOrder(orderId: string): Promise<VerifiedOrder> {
  try {
    const apiKey = getApiKey()
    const storeId = getStoreId()

    const response = await fetch(`${LEMON_SQUEEZY_API_URL}/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/vnd.api+json',
      },
    })

    if (!response.ok) return { valid: false }

    const result = await response.json()
    const attrs = result.data?.attributes
    const orderStoreId = String(attrs?.store_id)

    if (orderStoreId !== storeId) return { valid: false }

    return {
      valid: true,
      status: attrs?.status,
      refunded: attrs?.refunded ?? false,
      total: attrs?.total,
      userEmail: attrs?.user_email,
    }
  } catch {
    return { valid: false }
  }
}

/**
 * Lemon Squeezy 웹훅 시그니처 검증 (HMAC-SHA256)
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  try {
    if (!signature || !rawBody) return false
    const secret = getWebhookSecret()
    const hmac = createHmac('sha256', secret)
    const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'hex')
    const sig = Buffer.from(signature, 'hex')
    if (digest.length !== sig.length) return false
    return timingSafeEqual(digest, sig)
  } catch {
    return false
  }
}
