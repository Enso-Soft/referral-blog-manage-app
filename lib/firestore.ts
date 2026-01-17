import { Timestamp } from 'firebase/firestore'

export interface Product {
  name: string
  affiliateLink: string
}

export interface BlogPost {
  id?: string
  userId: string           // 작성자 UID
  userEmail?: string       // 작성자 이메일 (표시용)
  title: string
  content: string
  keywords: string[]
  products?: Product[]     // 제품 목록
  status: 'draft' | 'published'
  createdAt: Timestamp
  updatedAt: Timestamp
  metadata: {
    originalPath?: string
    wordCount: number
  }
}
