'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/responsive-dialog'
import { useAuthFetch } from '@/hooks/useAuthFetch'

interface CreditUser {
  userId: string
  email: string
  displayName: string | null
  sCredit: number
  eCredit: number
  totalCredit: number
  lastCheckIn: string | null
}

export function CreditUsersTab() {
  const { authFetch } = useAuthFetch()
  const [users, setUsers] = useState<CreditUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // 지급/차감 모달
  const [selectedUser, setSelectedUser] = useState<CreditUser | null>(null)
  const [grantForm, setGrantForm] = useState({ sAmount: 0, eAmount: 0, description: '' })
  const [granting, setGranting] = useState(false)
  const [grantMessage, setGrantMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/admin/credits/users?limit=100')
      const json = await res.json()
      if (json.success) setUsers(json.data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => { loadUsers() }, [loadUsers])

  const filteredUsers = search
    ? users.filter((u) =>
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.displayName?.toLowerCase().includes(search.toLowerCase())
      )
    : users

  const handleGrant = async (isDeduct: boolean) => {
    if (!selectedUser) return
    setGranting(true)
    setGrantMessage(null)
    try {
      const body = {
        userId: selectedUser.userId,
        sAmount: isDeduct ? -Math.abs(grantForm.sAmount) : Math.abs(grantForm.sAmount),
        eAmount: isDeduct ? -Math.abs(grantForm.eAmount) : Math.abs(grantForm.eAmount),
        description: grantForm.description,
      }
      const res = await authFetch('/api/admin/credits/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.success) {
        setGrantMessage({ type: 'success', text: json.message })
        loadUsers() // 목록 새로고침
        setGrantForm({ sAmount: 0, eAmount: 0, description: '' })
      } else {
        setGrantMessage({ type: 'error', text: json.error || '실패' })
      }
    } catch {
      setGrantMessage({ type: 'error', text: '요청 중 오류 발생' })
    } finally {
      setGranting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      {/* 검색 */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="이메일 또는 이름으로 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* 유저 테이블 */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium">유저</th>
              <th className="text-right px-4 py-2 font-medium">E&apos;Credit</th>
              <th className="text-right px-4 py-2 font-medium">S&apos;Credit</th>
              <th className="text-right px-4 py-2 font-medium">합계</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredUsers.map((u) => (
              <tr
                key={u.userId}
                className="hover:bg-muted/30 cursor-pointer"
                onClick={() => {
                  setSelectedUser(u)
                  setGrantForm({ sAmount: 0, eAmount: 0, description: '' })
                  setGrantMessage(null)
                }}
              >
                <td className="px-4 py-2.5">
                  <p className="font-medium">{u.displayName || '-'}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </td>
                <td className="text-right px-4 py-2.5 tabular-nums">{u.eCredit.toLocaleString()}</td>
                <td className="text-right px-4 py-2.5 tabular-nums">{u.sCredit.toLocaleString()}</td>
                <td className="text-right px-4 py-2.5 tabular-nums font-medium">{u.totalCredit.toLocaleString()}</td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-6 text-muted-foreground">검색 결과가 없습니다</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 지급/차감 모달 */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => { if (!open) setSelectedUser(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>크레딧 지급/차감</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="text-sm">
                <p className="font-medium">{selectedUser.displayName || selectedUser.email}</p>
                <p className="text-xs text-muted-foreground">{selectedUser.userId}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  현재 잔액: E {selectedUser.eCredit.toLocaleString()} / S {selectedUser.sCredit.toLocaleString()}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">E&apos;Credit</label>
                  <Input
                    type="number"
                    value={grantForm.eAmount}
                    onChange={(e) => setGrantForm({ ...grantForm, eAmount: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">S&apos;Credit</label>
                  <Input
                    type="number"
                    value={grantForm.sAmount}
                    onChange={(e) => setGrantForm({ ...grantForm, sAmount: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium">설명</label>
                <Textarea
                  value={grantForm.description}
                  onChange={(e) => setGrantForm({ ...grantForm, description: e.target.value })}
                  placeholder="지급/차감 사유를 입력하세요"
                  rows={2}
                />
              </div>

              {grantMessage && (
                <p className={`text-sm ${grantMessage.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                  {grantMessage.text}
                </p>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="destructive"
              onClick={() => handleGrant(true)}
              disabled={granting || (!grantForm.sAmount && !grantForm.eAmount) || !grantForm.description}
            >
              {granting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              차감
            </Button>
            <Button
              onClick={() => handleGrant(false)}
              disabled={granting || (!grantForm.sAmount && !grantForm.eAmount) || !grantForm.description}
            >
              {granting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              지급
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
