'use client'

import { Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/responsive-dialog'

interface WPConfirmModalsProps {
  showOverwriteModal: boolean
  overwriteSiteIds: string[]
  showNoCategoryModal: boolean
  noCategorySiteIds: string[]
  getSiteName: (siteId: string) => string
  onOverwriteClose: () => void
  onOverwriteConfirm: () => void
  onNoCategoryClose: () => void
  onNoCategoryConfirm: () => void
}

export function WPConfirmModals({
  showOverwriteModal,
  overwriteSiteIds,
  showNoCategoryModal,
  noCategorySiteIds,
  getSiteName,
  onOverwriteClose,
  onOverwriteConfirm,
  onNoCategoryClose,
  onNoCategoryConfirm,
}: WPConfirmModalsProps) {
  return (
    <>
      {/* Overwrite confirmation modal */}
      <Dialog open={showOverwriteModal} onOpenChange={(open) => { if (!open) onOverwriteClose() }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>기존 글이 존재합니다</DialogTitle>
            <DialogDescription asChild>
              {overwriteSiteIds.length === 1 ? (
                <p>
                  이 사이트에 이미 발행된 글이 있습니다. 새로 발행하면 발행 주소가 덮어씌워집니다.
                </p>
              ) : (
                <div>
                  <p className="mb-2">
                    다음 사이트에 이미 발행된 글이 있습니다:
                  </p>
                  <ul className="space-y-1 ml-1">
                    {overwriteSiteIds.map(id => (
                      <li key={id} className="flex items-center gap-1.5 text-sm text-foreground/70">
                        <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        {getSiteName(id)}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2">
                    새로 발행하면 발행 주소가 덮어씌워집니다.
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onOverwriteClose}>
              취소
            </Button>
            <Button onClick={onOverwriteConfirm}>
              새로 발행
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* No category confirmation modal */}
      <Dialog open={showNoCategoryModal} onOpenChange={(open) => { if (!open) onNoCategoryClose() }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>카테고리 미선택</DialogTitle>
            <DialogDescription asChild>
              {noCategorySiteIds.length === 1 ? (
                <p>
                  카테고리를 선택하지 않았습니다. 그래도 발행하시겠습니까?
                </p>
              ) : (
                <div>
                  <p className="mb-2">
                    다음 사이트에 카테고리가 선택되지 않았습니다:
                  </p>
                  <ul className="space-y-1 ml-1">
                    {noCategorySiteIds.map(id => (
                      <li key={id} className="flex items-center gap-1.5 text-sm text-foreground/70">
                        <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        {getSiteName(id)}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2">
                    그래도 발행하시겠습니까?
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onNoCategoryClose}>
              취소
            </Button>
            <Button onClick={onNoCategoryConfirm}>
              그래도 발행
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
