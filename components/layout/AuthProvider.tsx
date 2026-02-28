'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { type User } from 'firebase/auth'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { useQueryClient } from '@tanstack/react-query'
import { getFirebaseDb } from '@/lib/firebase'
import { queryKeys } from '@/lib/query-client'
import { useCredit } from '@/context/CreditContext'

interface UserProfile {
  role: 'admin' | 'user'
  displayName?: string
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  isAdmin: boolean
  getAuthToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  isAdmin: false,
  getAuthToken: async () => null,
})

/** 오늘 이미 출석했는지 클라이언트 측 판단 */
function isCheckedInToday(lastCheckIn: unknown): boolean {
  if (!lastCheckIn) return false
  const date = typeof (lastCheckIn as { toDate?: () => Date }).toDate === 'function'
    ? (lastCheckIn as { toDate: () => Date }).toDate()
    : new Date(lastCheckIn as string)
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const profileLoaded = useRef(false)
  const checkinAttempted = useRef(false)
  const creditUnsubscribe = useRef<(() => void) | null>(null)
  const queryClient = useQueryClient()
  const { setSCredit, setECredit } = useCredit()

  useEffect(() => {
    if (typeof window === 'undefined') return

    let unsubscribe: (() => void) | undefined

    const initAuth = async () => {
      try {
        const { onAuthChange } = await import('@/lib/auth')

        unsubscribe = onAuthChange(async (firebaseUser) => {
          setUser(firebaseUser)

          if (firebaseUser) {
            // 같은 유저의 토큰 갱신이면 Firestore 재조회 스킵
            if (profileLoaded.current) {
              setLoading(false)
              return
            }

            try {
              const userDocRef = doc(getFirebaseDb(), 'users', firebaseUser.uid)
              const userDoc = await getDoc(userDocRef)

              if (userDoc.exists()) {
                const data = userDoc.data()
                setUserProfile({
                  role: data.role || 'user',
                  displayName: data.displayName,
                })
                setSCredit(data.sCredit ?? 0)
                setECredit(data.eCredit ?? 0)
                profileLoaded.current = true

                // 자동 출석 체크: 오늘 아직 안 했으면 백그라운드 수행
                if (!isCheckedInToday(data.lastCheckIn) && !checkinAttempted.current) {
                  checkinAttempted.current = true
                  autoCheckin().catch(() => {})
                }
              } else {
                setUserProfile({ role: 'user' })
                setSCredit(0)
                setECredit(0)
                profileLoaded.current = true
              }

              // 초기 로드 후 onSnapshot 구독 시작 (크레딧 실시간 반영)
              if (creditUnsubscribe.current) creditUnsubscribe.current()
              const initialData = userDoc.exists() ? userDoc.data() : null
              let prevS = initialData?.sCredit ?? 0
              let prevE = initialData?.eCredit ?? 0
              creditUnsubscribe.current = onSnapshot(userDocRef, (snapshot) => {
                if (!snapshot.exists()) return
                const d = snapshot.data()
                const newS = d.sCredit ?? 0
                const newE = d.eCredit ?? 0
                if (newS !== prevS || newE !== prevE) {
                  prevS = newS
                  prevE = newE
                  queryClient.invalidateQueries({ queryKey: queryKeys.credits.all })
                }
                setSCredit(newS)
                setECredit(newE)
              })
            } catch (error) {
              console.error('Failed to load user profile:', error)
              setUserProfile({ role: 'user' })
              setSCredit(0)
              setECredit(0)
            }
          } else {
            // 로그아웃
            setUserProfile(null)
            setSCredit(0)
            setECredit(0)
            profileLoaded.current = false
            checkinAttempted.current = false
            if (creditUnsubscribe.current) {
              creditUnsubscribe.current()
              creditUnsubscribe.current = null
            }
          }

          setLoading(false)
        })
      } catch (error) {
        console.error('Failed to initialize auth:', error)
        setLoading(false)
      }
    }

    initAuth()

    return () => {
      if (unsubscribe) unsubscribe()
      if (creditUnsubscribe.current) creditUnsubscribe.current()
    }
  }, [])

  /** 백그라운드 자동 출석 체크 — 실패해도 무시 */
  const autoCheckin = async () => {
    try {
      const { getIdToken } = await import('@/lib/auth')
      const token = await getIdToken()
      if (!token) return

      const res = await fetch('/api/credits/checkin', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data) {
          setSCredit(json.data.sCredit)
          setECredit(json.data.eCredit)
        }
      }
    } catch {
      // 자동 출석 실패는 조용히 무시
    }
  }

  const getAuthToken = useCallback(async () => {
    try {
      const { getIdToken } = await import('@/lib/auth')
      return getIdToken()
    } catch {
      return null
    }
  }, [])

  const isAdmin = userProfile?.role === 'admin'

  const value = useMemo(() => ({
    user, userProfile, loading, isAdmin, getAuthToken
  }), [user, userProfile, loading, isAdmin, getAuthToken])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
