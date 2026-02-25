'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/components/layout/AuthProvider'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CreditSettingsTab } from '@/components/admin/CreditSettingsTab'
import { CreditUsersTab } from '@/components/admin/CreditUsersTab'
import { CreditTransactionsTab } from '@/components/admin/CreditTransactionsTab'
import { CreditIntegrityTab } from '@/components/admin/CreditIntegrityTab'

const TABS = [
  { key: 'settings', label: '설정' },
  { key: 'users', label: '유저별' },
  { key: 'transactions', label: '트랜잭션' },
  { key: 'integrity', label: '무결성' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function AdminCreditsPage() {
  return (
    <Suspense>
      <AdminCreditsContent />
    </Suspense>
  )
}

function AdminCreditsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading, isAdmin } = useAuth()
  const [tab, setTab] = useState<TabKey>((searchParams.get('tab') as TabKey) || 'settings')

  if (!loading && (!user || !isAdmin)) {
    router.replace('/')
    return null
  }

  const handleTabChange = (key: TabKey) => {
    setTab(key)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', key)
    window.history.replaceState({}, '', url.toString())
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 뒤로가기 */}
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Admin Dashboard
      </Link>

      <h1 className="text-2xl font-bold mb-6">크레딧 관리</h1>

      {/* 탭 바 */}
      <div className="flex gap-1 border-b mb-6 overflow-x-auto">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={cn(
              'relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
              tab === key
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground/70'
            )}
          >
            {label}
            {tab === key && (
              <motion.div
                layoutId="credit-tab-indicator"
                className="absolute inset-x-0 -bottom-px h-0.5 bg-primary"
              />
            )}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {tab === 'settings' && <CreditSettingsTab />}
          {tab === 'users' && <CreditUsersTab />}
          {tab === 'transactions' && <CreditTransactionsTab />}
          {tab === 'integrity' && <CreditIntegrityTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
