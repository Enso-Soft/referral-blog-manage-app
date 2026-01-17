'use client'

interface PostViewerProps {
  content: string
}

export function PostViewer({ content }: PostViewerProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div
        className="tiptap max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  )
}
