import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const DragHandle = forwardRef<HTMLDivElement, { className?: string }>(
  ({ className }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex justify-center py-3 cursor-grab active:cursor-grabbing touch-none',
        className
      )}
    >
      <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
    </div>
  )
)
DragHandle.displayName = 'DragHandle'

export { DragHandle }
