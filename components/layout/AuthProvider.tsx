'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react'
import { type User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { getFirebaseDb } from '@/lib/firebase'

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 클라이언트에서만 실행
    if (typeof window === 'undefined') {
      return
    }

    let unsubscribe: (() => void) | undefined

    const initAuth = async () => {
      try {
        // 동적 import로 auth 모듈 로드
        const { onAuthChange, getIdToken } = await import('@/lib/auth')

        unsubscribe = onAuthChange(async (firebaseUser) => {
          setUser(firebaseUser)

          if (firebaseUser) {
            // Firestore에서 사용자 프로필 로드
            try {
              const userDocRef = doc(getFirebaseDb(), 'users', firebaseUser.uid)
              const userDoc = await getDoc(userDocRef)

              if (userDoc.exists()) {
                const data = userDoc.data()
                setUserProfile({
                  role: data.role || 'user',
                  displayName: data.displayName,
                })
              } else {
                setUserProfile({ role: 'user' })
              }
            } catch (error) {
              console.error('Failed to load user profile:', error)
              setUserProfile({ role: 'user' })
            }
          } else {
            setUserProfile(null)
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
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [])

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
