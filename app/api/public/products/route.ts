import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getDb } from '@/lib/firebase-admin'
import { requireResource, requirePermission } from '@/lib/api-error-handler'
import { createApiHandler } from '@/lib/api-handler'
import { TTLCache } from '@/lib/cache'

// 카테고리 통계 인메모리 캐시 (per-user, 60초 TTL)
type CategoryStats = { name: string; count: number }[]
const categoryStatsCache = new TTLCache<CategoryStats>(60_000, 200)

// 제품 데이터 타입
interface ProductData {
  id?: string
  name: string
  price?: number
  images?: string[]
  detailImages?: string[]
  affiliateLink: string
  category1?: string
  category2?: string
  category3?: string
  brand?: string
  [key: string]: unknown
}

// nameKeywords 생성 (검색용) - N-gram 방식으로 모든 부분 문자열 생성
function generateNameKeywords(name: string, brand?: string): string[] {
  // 브랜드가 있으면 이름과 합쳐서 키워드 생성
  const text = brand ? `${name} ${brand}` : name
  const words = text.toLowerCase().split(/\s+/)
  const keywords: Set<string> = new Set()

  words.forEach(word => {
    // 모든 부분 문자열 생성 (N-gram)
    // "가습기" → ["가", "가습", "가습기", "습", "습기", "기"]
    for (let start = 0; start < word.length; start++) {
      for (let end = start + 1; end <= word.length; end++) {
        keywords.add(word.substring(start, end))
      }
    }
  })

  return Array.from(keywords)
}

// GET: 제품 목록/단일 제품 조회 (API Key 또는 Bearer Token)
export const GET = createApiHandler({ auth: 'both' }, async (request: NextRequest, { auth }) => {
  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('id')
  const category = searchParams.get('category')
  const search = searchParams.get('search') || searchParams.get('keyword')
  const perPage = parseInt(searchParams.get('limit') || searchParams.get('perPage') || '20')
  const page = parseInt(searchParams.get('page') || '1')
  const lastId = searchParams.get('lastId')

  // 가격 범위 필터
  const minPrice = searchParams.get('minPrice') || searchParams.get('min-price')
  const maxPrice = searchParams.get('maxPrice') || searchParams.get('max-price')
  const minPriceNum = minPrice ? parseInt(minPrice) : null
  const maxPriceNum = maxPrice ? parseInt(maxPrice) : null

  const db = getDb()
  const productsRef = db.collection('products')

  // 단일 제품 조회
  if (productId) {
    const docId = `${auth!.userId}_${productId}`
    const docSnap = await productsRef.doc(docId).get()

    if (!docSnap.exists) {
      // productId로 직접 조회 시도
      const directSnap = await productsRef.doc(productId).get()
      if (directSnap.exists) {
        const data = directSnap.data()
        if (data?.userId === auth!.userId) {
          const { nameKeywords, ...productData } = data
          return NextResponse.json({
            success: true,
            product: { id: directSnap.id, ...productData }
          })
        }
      }
      requireResource(null, '제품을 찾을 수 없습니다')
    }

    const data = docSnap.data()!
    requirePermission(data.userId === auth!.userId, '접근 권한이 없습니다')

    const { nameKeywords, ...productData } = data
    return NextResponse.json({
      success: true,
      product: { id: docSnap.id, ...productData }
    })
  }

  // 목록 조회
  const userProductsQuery = productsRef.where('userId', '==', auth!.userId)
  let products: { id: string; [key: string]: unknown }[] = []
  let isSearchResult = false
  let totalCount: number | undefined
  let pagination: {
    currentPage: number
    totalPages: number
    perPage: number
    totalCount: number
    hasNextPage: boolean
    hasPrevPage: boolean
  } | undefined

  // 검색 필터 (nameKeywords + brand 병렬 검색)
  if (search) {
    isSearchResult = true
    const searchTerm = search.toLowerCase().trim()
    const searchLimit = 200 // 검색 결과 후 필터링을 위해 넉넉하게

    // 검색어를 단어로 분리 (array-contains는 가장 긴 단어로, 나머지는 클라이언트 필터링)
    const searchWords = searchTerm.split(/\s+/).filter(w => w.length > 0)
    // 가장 긴 단어를 쿼리 키워드로 사용 (N-gram 특성상 길수록 고유하여 결과가 적음)
    const queryWord = searchWords.reduce((a, b) => a.length >= b.length ? a : b, searchWords[0])

    const [keywordSnapshot, brandSnapshot, affiliateLinkSnapshot, finalUrlSnapshot] = await Promise.all([
      productsRef
        .where('userId', '==', auth!.userId)
        .where('nameKeywords', 'array-contains', queryWord)
        .limit(searchLimit)
        .get(),
      productsRef
        .where('userId', '==', auth!.userId)
        .where('brand', '==', search.trim())
        .limit(searchLimit)
        .get(),
      productsRef
        .where('userId', '==', auth!.userId)
        .where('affiliateLink', '==', search.trim())
        .limit(searchLimit)
        .get(),
      productsRef
        .where('userId', '==', auth!.userId)
        .where('finalUrl', '==', search.trim())
        .limit(searchLimit)
        .get(),
    ])

    const productMap = new Map<string, { id: string; [key: string]: unknown }>()

    const addToMap = (docs: FirebaseFirestore.QueryDocumentSnapshot[]) => {
      docs.forEach((doc) => {
        if (!productMap.has(doc.id)) {
          productMap.set(doc.id, { id: doc.id, ...doc.data() })
        }
      })
    }

    addToMap(keywordSnapshot.docs)
    addToMap(brandSnapshot.docs)
    addToMap(affiliateLinkSnapshot.docs)
    addToMap(finalUrlSnapshot.docs)

    // 여러 단어 검색 시 나머지 단어로 클라이언트 필터링
    if (searchWords.length > 1) {
      const remainingWords = searchWords.filter(w => w !== queryWord)
      const idsToDelete: string[] = []
      productMap.forEach((product, id) => {
        const name = ((product.name as string) || '').toLowerCase()
        const brand = ((product.brand as string) || '').toLowerCase()
        const text = `${name} ${brand}`
        const allMatch = remainingWords.every(word => text.includes(word))
        if (!allMatch) {
          idsToDelete.push(id)
        }
      })
      idsToDelete.forEach(id => productMap.delete(id))
    }

    let allProducts = Array.from(productMap.values())

    // 가격 범위 필터 적용
    if (minPriceNum !== null || maxPriceNum !== null) {
      allProducts = allProducts.filter(p => {
        const price = (p.price as number) || 0
        if (minPriceNum !== null && price < minPriceNum) return false
        if (maxPriceNum !== null && price > maxPriceNum) return false
        return true
      })
    }

    // 페이지네이션 적용
    totalCount = allProducts.length
    const totalPages = Math.ceil(totalCount / perPage)
    const startIndex = (page - 1) * perPage
    products = allProducts.slice(startIndex, startIndex + perPage)

    pagination = {
      currentPage: page,
      totalPages,
      perPage,
      totalCount,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    }
  }
  // 카테고리 필터 또는 전체 조회
  else {
    // 기본 쿼리 구성
    let baseQuery: FirebaseFirestore.Query = productsRef.where('userId', '==', auth!.userId)

    if (category) {
      baseQuery = baseQuery.where('category.level1', '==', category)
    }

    // 가격 범위 필터 (Firestore 쿼리)
    if (minPriceNum !== null) {
      baseQuery = baseQuery.where('price', '>=', minPriceNum)
    }
    if (maxPriceNum !== null) {
      baseQuery = baseQuery.where('price', '<=', maxPriceNum)
    }

    // 전체 개수 조회
    const countSnapshot = await baseQuery.count().get()
    totalCount = countSnapshot.data().count
    const totalPages = Math.ceil(totalCount / perPage)

    // 커서 기반 페이지네이션 (offset 대신 사용 - 비용 효율적)
    let query = baseQuery
    if (!minPriceNum && !maxPriceNum) {
      query = query.orderBy('assignedAt', 'desc')
    }
    query = query.limit(perPage)

    if (lastId) {
      const lastDoc = await productsRef.doc(lastId).get()
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc)
      }
    }

    const snapshot = await query.get()
    products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

    pagination = {
      currentPage: page,
      totalPages,
      perPage,
      totalCount,
      hasNextPage: products.length === perPage,
      hasPrevPage: !!lastId,
    }
  }

  // 카테고리 통계 (첫 요청 + 전체 카테고리 + 필터 없을 때만)
  // lastId가 있으면 페이지네이션 중이므로 통계 조회 불필요
  let categoryStats: { name: string; count: number }[] | undefined

  if (!lastId && !category && !search && !minPriceNum && !maxPriceNum) {
    // 캐시 확인
    const cached = categoryStatsCache.get(auth!.userId)
    if (cached) {
      categoryStats = cached
    } else {
      const allUserProductsSnapshot = await productsRef
        .where('userId', '==', auth!.userId)
        .select('category.level1')
        .get()

      const categoryCounts: Record<string, number> = {}
      allUserProductsSnapshot.docs.forEach((doc) => {
        const cat = doc.data()?.category?.level1
        if (cat) {
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
        }
      })

      categoryStats = Object.entries(categoryCounts)
        .map(([name, count]) => ({ name, count }))
        .filter((c) => c.count > 0)
        .sort((a, b) => b.count - a.count)

      categoryStatsCache.set(auth!.userId, categoryStats)
    }
  }

  // nameKeywords 필드 제거 (검색용으로만 사용, 응답에 불필요)
  const cleanProducts = products.map(({ nameKeywords, ...rest }) => rest)

  return NextResponse.json({
    success: true,
    products: cleanProducts,
    // 커서 기반용 (첫 로드 시에도 hasMore 계산)
    hasMore: lastId
      ? products.length === perPage
      : (pagination?.hasNextPage ?? products.length === perPage),
    // 페이지 기반용
    pagination,
    total: totalCount,
    categoryStats,
  })
})

// POST: 제품 추가 (API Key만 지원)
export const POST = createApiHandler({ auth: 'apiKey' }, async (request: NextRequest, { auth }) => {
  const body: ProductData = await request.json()

  // 필수 필드 검증
  if (!body.name) {
    return NextResponse.json(
      { success: false, error: 'name 필드는 필수입니다.' },
      { status: 400 }
    )
  }

  if (!body.affiliateLink) {
    return NextResponse.json(
      { success: false, error: 'affiliateLink 필드는 필수입니다.' },
      { status: 400 }
    )
  }

  const db = getDb()
  const now = Timestamp.now()

  // 고유 제품 ID 생성
  const productId = body.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  const docId = `${auth!.userId}_${productId}`

  // 제품 데이터 구성
  const productData = {
    userId: auth!.userId,
    productId,
    name: body.name,
    price: body.price || 0,
    images: body.images || [],
    detailImages: body.detailImages || [],
    affiliateLink: body.affiliateLink,
    category: {
      level1: body.category1 || '',
      level2: body.category2 || '',
      level3: body.category3 || '',
    },
    brand: body.brand || '',
    nameKeywords: generateNameKeywords(body.name, body.brand),
    assignedAt: now,
    createdAt: now,
    updatedAt: now,
    source: 'api',
  }

  await db.collection('products').doc(docId).set(productData)

  categoryStatsCache.delete(auth!.userId)

  return NextResponse.json({
    success: true,
    product: { id: docId, ...productData },
    message: '제품이 등록되었습니다.',
  })
})

// PATCH: 제품 수정 (API Key만 지원)
export const PATCH = createApiHandler({ auth: 'apiKey' }, async (request: NextRequest, { auth }) => {
  const body: Partial<ProductData> & { id: string } = await request.json()

  // ID 필드 검증
  if (!body.id) {
    return NextResponse.json(
      { success: false, error: 'id 필드는 필수입니다.' },
      { status: 400 }
    )
  }

  const db = getDb()
  const productsRef = db.collection('products')

  // 문서 ID 결정 (userId_productId 형태 또는 직접 ID)
  let docId = body.id
  let docSnap = await productsRef.doc(docId).get()

  // 찾을 수 없으면 userId_productId 형태로 시도
  if (!docSnap.exists) {
    docId = `${auth!.userId}_${body.id}`
    docSnap = await productsRef.doc(docId).get()
  }

  requireResource(docSnap.exists, '제품을 찾을 수 없습니다')

  const existingData = docSnap.data()
  requirePermission(existingData?.userId === auth!.userId, '접근 권한이 없습니다')

  // 업데이트할 데이터 구성
  const updateData: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  }

  if (body.name !== undefined) {
    updateData.name = body.name
  }
  if (body.brand !== undefined) {
    updateData.brand = body.brand
  }
  // name이나 brand가 변경되면 nameKeywords 재생성
  if (body.name !== undefined || body.brand !== undefined) {
    const newName = body.name ?? existingData?.name ?? ''
    const newBrand = body.brand ?? existingData?.brand ?? ''
    updateData.nameKeywords = generateNameKeywords(newName, newBrand)
  }
  if (body.price !== undefined) updateData.price = body.price
  if (body.images !== undefined) updateData.images = body.images
  if (body.detailImages !== undefined) updateData.detailImages = body.detailImages
  if (body.affiliateLink !== undefined) updateData.affiliateLink = body.affiliateLink
  if (body.category1 !== undefined || body.category2 !== undefined || body.category3 !== undefined) {
    updateData.category = {
      level1: body.category1 ?? existingData?.category?.level1 ?? '',
      level2: body.category2 ?? existingData?.category?.level2 ?? '',
      level3: body.category3 ?? existingData?.category?.level3 ?? '',
    }
  }

  await productsRef.doc(docId).update(updateData)

  categoryStatsCache.delete(auth!.userId)

  // 업데이트된 문서 반환
  const updatedDoc = await productsRef.doc(docId).get()

  return NextResponse.json({
    success: true,
    product: { id: docId, ...updatedDoc.data() },
    message: '제품이 수정되었습니다.',
  })
})

// DELETE: 제품 삭제 (API Key만 지원)
export const DELETE = createApiHandler({ auth: 'apiKey' }, async (request: NextRequest, { auth }) => {
  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('id')

  if (!productId) {
    return NextResponse.json(
      { success: false, error: 'id 파라미터는 필수입니다.' },
      { status: 400 }
    )
  }

  const db = getDb()
  const productsRef = db.collection('products')

  // 문서 ID 결정 (userId_productId 형태 또는 직접 ID)
  let docId = productId
  let docSnap = await productsRef.doc(docId).get()

  // 찾을 수 없으면 userId_productId 형태로 시도
  if (!docSnap.exists) {
    docId = `${auth!.userId}_${productId}`
    docSnap = await productsRef.doc(docId).get()
  }

  requireResource(docSnap.exists, '제품을 찾을 수 없습니다')

  const existingData = docSnap.data()
  requirePermission(existingData?.userId === auth!.userId, '접근 권한이 없습니다')

  await productsRef.doc(docId).delete()

  categoryStatsCache.delete(auth!.userId)

  return NextResponse.json({
    success: true,
    message: '제품이 삭제되었습니다.',
  })
})
