import { toast } from 'sonner'

/**
 * 전역 토스트 알림 시스템
 * 기존 Snackbar setState + setTimeout 패턴을 대체
 */
export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  warning: (message: string) => toast.warning(message),
  loading: (message: string) => toast.loading(message),
  dismiss: (id?: string | number) => toast.dismiss(id),
}
