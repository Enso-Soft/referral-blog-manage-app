'use client'

interface PostViewerProps {
  content: string
}

export function PostViewer({ content }: PostViewerProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div
        className="tiptap max-w-none text-gray-900 dark:text-gray-100"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  )
}
