/**
 * 포스트 편집 페이지 로딩 UI
 */
export default function EditLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-secondary rounded-lg animate-pulse" />
          <div className="h-8 w-48 bg-secondary rounded-lg animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-10 w-24 bg-secondary rounded-xl animate-pulse" />
          <div className="h-10 w-20 bg-secondary rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Title input skeleton */}
      <div className="h-12 w-full bg-secondary rounded-lg animate-pulse" />

      {/* Editor mode tabs skeleton */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-9 w-24 bg-secondary rounded-lg animate-pulse" />
        ))}
      </div>

      {/* Editor area skeleton */}
      <div className="h-[600px] w-full bg-card border border-border rounded-2xl animate-pulse" />
    </div>
  )
}
