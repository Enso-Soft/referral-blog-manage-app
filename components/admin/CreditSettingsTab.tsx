'use client'

import { useState, useEffect } from 'react'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import type { CreditSettings } from '@/lib/schemas/credit'

const FIELD_LABELS: { key: keyof CreditSettings; label: string; desc: string }[] = [
  { key: 'signupGrantAmount', label: '가입 지급량 (S)', desc: '신규 가입 시 지급되는 S\'Credit' },
  { key: 'checkinGrantAmount', label: '출석 체크 지급량 (S)', desc: '일일 출석 체크 시 지급량' },
  { key: 'checkinMaxCap', label: '출석 체크 상한 (S)', desc: 'S\'Credit이 이 값 이상이면 출석 지급 불가' },
  { key: 'aiWritePreChargeAmount', label: 'AI 작성 선결제', desc: 'AI 글 작성 요청 시 선결제 금액' },
  { key: 'aiChatPerMessageCost', label: 'AI 채팅 메시지당', desc: 'AI 채팅 메시지 1건당 비용' },
  { key: 'wpPublishCost', label: 'WP 발행 비용', desc: 'WordPress 발행 1건당 비용' },
  { key: 'creditPerWon', label: "E'Credit 환율 (원)", desc: '1원당 지급되는 E\'Credit 수' },
]

export function CreditSettingsTab() {
  const { authFetch } = useAuthFetch()
  const [settings, setSettings] = useState<CreditSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authFetch('/api/admin/credits/settings')
        const json = await res.json()
        if (json.success) setSettings(json.data)
      } catch {
        setMessage({ type: 'error', text: '설정 로드 실패' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [authFetch])

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    setMessage(null)
    try {
      const res = await authFetch('/api/admin/credits/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const json = await res.json()
      if (json.success) {
        setMessage({ type: 'success', text: '설정이 저장되었습니다' })
      } else {
        setMessage({ type: 'error', text: json.error || '저장 실패' })
      }
    } catch {
      setMessage({ type: 'error', text: '저장 중 오류 발생' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!settings) return <p className="text-sm text-red-500 py-4">설정을 불러올 수 없습니다</p>

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {FIELD_LABELS.map(({ key, label, desc }) => (
          <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="sm:w-56 flex-shrink-0">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <Input
              type="number"
              value={settings[key]}
              onChange={(e) => setSettings({ ...settings, [key]: Number(e.target.value) })}
              className="sm:w-40"
            />
          </div>
        ))}
      </div>

      {message && (
        <p className={`text-sm ${message.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
          {message.text}
        </p>
      )}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
        저장
      </Button>
    </div>
  )
}
