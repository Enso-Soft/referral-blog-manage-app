'use client'

interface SnackbarProps {
  message: string
  visible: boolean
}

export function Snackbar({ message, visible }: SnackbarProps) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out ${
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <div className="bg-gray-800 dark:bg-gray-700 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium">
        {message}
      </div>
    </div>
  )
}
