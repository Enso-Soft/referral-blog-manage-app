'use client'

import { motion } from 'framer-motion'

function formatValue(v: number) {
  if (v >= 10000) return `${(v / 10000).toFixed(1)}만`
  if (v >= 1000) return `${(v / 1000).toFixed(1)}천`
  return String(v)
}

function formatPeriod(period: string) {
  const match = period.match(/^(\d{4})-(\d{1,2})$/)
  if (match) return `${match[1]}년 ${parseInt(match[2])}월`
  return period
}

export function TrendChart({ dataPoints, keyword }: { dataPoints: { period: string; value: number }[]; keyword: string }) {
  const maxValue = Math.max(...dataPoints.map(d => d.value), 1)
  const BAR_MAX_HEIGHT = 64

  return (
    <div>
      <p className="text-xs font-medium text-foreground mb-2">{keyword}</p>
      <div className="flex items-end gap-1.5" style={{ height: BAR_MAX_HEIGHT }}>
        {dataPoints.map((dp, i) => {
          const heightPx = Math.max(Math.round((dp.value / maxValue) * BAR_MAX_HEIGHT), 3)
          const isMax = dp.value === maxValue
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5">
              <span className={`text-[10px] leading-none ${isMax ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'text-muted-foreground'}`}>
                {formatValue(dp.value)}
              </span>
              <motion.div
                className={`w-full rounded-t ${isMax ? 'bg-indigo-500 dark:bg-indigo-400' : 'bg-indigo-300 dark:bg-indigo-600'}`}
                initial={{ height: 0 }}
                animate={{ height: heightPx }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-1.5 mt-1">
        {dataPoints.map((dp, i) => (
          <span key={i} className="flex-1 text-[10px] text-muted-foreground truncate text-center">{formatPeriod(dp.period)}</span>
        ))}
      </div>
    </div>
  )
}
