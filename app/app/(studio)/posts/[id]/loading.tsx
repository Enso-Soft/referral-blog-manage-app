/**
 * 포스트 상세 페이지 로딩 UI
 */
export default function PostLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Back link skeleton */}
      <div className="h-5 w-24 bg-secondary rounded animate-pulse" />

      {/* Header skeleton */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex-1 space-y-4">
          {/* Title */}
          <div className="h-10 w-3/4 bg-secondary rounded-lg animate-pulse" />

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="h-7 w-16 bg-secondary rounded-full animate-pulse" />
            <div className="h-7 w-20 bg-secondary rounded-full animate-pulse" />
            <div className="h-5 w-32 bg-secondary/60 rounded animate-pulse" />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <div className="h-10 w-24 bg-secondary rounded-xl animate-pulse" />
          <div className="h-10 w-20 bg-secondary rounded-xl animate-pulse" />
          <div className="h-10 w-20 bg-secondary rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Keywords skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 bg-secondary rounded animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-6 w-16 bg-secondary/60 rounded animate-pulse" />
        ))}
      </div>

      {/* Published URL skeleton */}
      <div className="space-y-2">
        <div className="h-5 w-24 bg-secondary rounded animate-pulse" />
        <div className="h-10 w-full bg-secondary/60 rounded-lg animate-pulse" />
      </div>

      {/* Content skeleton */}
      <div className="space-y-4 bg-card border border-border rounded-2xl p-6">
        <div className="h-6 w-full bg-secondary rounded animate-pulse" />
        <div className="h-6 w-5/6 bg-secondary rounded animate-pulse" />
        <div className="h-6 w-4/5 bg-secondary rounded animate-pulse" />
        <div className="h-40 w-full bg-secondary/60 rounded-lg animate-pulse" />
        <div className="h-6 w-full bg-secondary rounded animate-pulse" />
        <div className="h-6 w-3/4 bg-secondary rounded animate-pulse" />
        <div className="h-6 w-5/6 bg-secondary rounded animate-pulse" />
      </div>
    </div>
  )
}
