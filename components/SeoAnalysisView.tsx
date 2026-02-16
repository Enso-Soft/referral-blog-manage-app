'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Target,
  Type,
  Compass,
  Lightbulb,
  AlertTriangle,
  Star,
  TrendingUp,
  CheckCircle2,
  Trophy,
  Shield,
  ShoppingCart,
  Flame,
  XCircle,
  Sparkles,
  Layers,
  Monitor,
  Smartphone,
  ChevronDown,
} from 'lucide-react'
import type { SeoAnalysis } from '@/lib/schemas'

interface SeoAnalysisViewProps {
  seoAnalysis: SeoAnalysis
}

function CompetitionBadge({ value }: { value: string }) {
  const config: Record<string, { label: string; className: string }> = {
    low: { label: '낮음', className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border border-green-200 dark:border-green-800/50' },
    medium: { label: '중간', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800/50' },
    high: { label: '높음', className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-800/50' },
  }
  const c = config[value] || { label: value, className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600' }

  return (
    <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full ${c.className}`}>
      {c.label}
    </span>
  )
}

function DifficultyBar({ score }: { score: number }) {
  const color = score <= 30 ? 'bg-green-500' : score <= 60 ? 'bg-yellow-500' : 'bg-red-500'
  const gradientColor = score <= 30
    ? 'from-green-400 to-green-500'
    : score <= 60
      ? 'from-yellow-400 to-orange-500'
      : 'from-orange-500 to-red-500'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-2.5 bg-gradient-to-r ${gradientColor} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className="text-sm font-bold tabular-nums w-8 text-right">{score}</span>
    </div>
  )
}

function DifficultyLevelBadge({ level, score }: { level?: string; score?: number }) {
  const getConfig = () => {
    if (score !== undefined) {
      if (score <= 30) return { className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' }
      if (score <= 50) return { className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' }
      if (score <= 75) return { className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' }
      return { className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
    }
    return { className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' }
  }
  const config = getConfig()
  const label = level || (score !== undefined ? `${score}/100` : '')

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.className}`}>
      {label}
    </span>
  )
}

function MobileRatio({ pcVolume, mobileVolume }: { pcVolume: number; mobileVolume: number }) {
  const total = pcVolume + mobileVolume
  if (total === 0) return null
  const mobilePercent = Math.round((mobileVolume / total) * 100)
  const pcPercent = 100 - mobilePercent

  return (
    <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="flex items-center gap-1.5 font-medium text-blue-600 dark:text-blue-400">
          <Monitor className="w-3.5 h-3.5" /> PC {pcPercent}%
        </span>
        <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
          <Smartphone className="w-3.5 h-3.5" /> 모바일 {mobilePercent}%
        </span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
        <motion.div
          className="bg-gradient-to-r from-blue-400 to-blue-500 dark:from-blue-500 dark:to-blue-400"
          initial={{ width: 0 }}
          animate={{ width: `${pcPercent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        <motion.div
          className="bg-gradient-to-r from-emerald-400 to-emerald-500 dark:from-emerald-500 dark:to-emerald-400"
          initial={{ width: 0 }}
          animate={{ width: `${mobilePercent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
        />
      </div>
    </div>
  )
}

function TrendChart({ dataPoints, keyword }: { dataPoints: { period: string; value: number }[]; keyword: string }) {
  const maxValue = Math.max(...dataPoints.map(d => d.value), 1)
  const BAR_MAX_HEIGHT = 64 // px

  function formatValue(v: number) {
    if (v >= 10000) return `${(v / 10000).toFixed(1)}만`
    if (v >= 1000) return `${(v / 1000).toFixed(1)}천`
    return String(v)
  }

  // "8월" → "8월", "2025-08" → "2025년 8월"
  function formatPeriod(period: string) {
    const match = period.match(/^(\d{4})-(\d{1,2})$/)
    if (match) return `${match[1]}년 ${parseInt(match[2])}월`
    return period
  }

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

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.3 },
  }),
}

export function SeoAnalysisView({ seoAnalysis }: SeoAnalysisViewProps) {
  const {
    mainKeyword,
    subKeywords,
    trendKeywords,
    titleOptions,
    searchIntent,
    serpCompetitors,
    blogCompetition,
    shoppingData,
    insights,
    risks,
    keywordCandidates,
    trendData,
  } = seoAnalysis

  const [showCompetitors, setShowCompetitors] = useState(false)
  let cardIndex = 0

  return (
    <div className="space-y-4">
      {/* 1. AI 분석 안내 배너 */}
      <motion.div
        className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/60 dark:border-blue-800/40"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Sparkles className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-900 dark:text-blue-200">AI 키워드 리서치 &amp; 의사결정</p>
          <p className="text-xs text-blue-700/80 dark:text-blue-300/70 mt-0.5 leading-relaxed">
            AI가 블로그 글 작성 전에 수행한 키워드 분석 결과입니다. 어떤 키워드 후보를 비교했고, 왜 이 키워드를 선택했는지, 검색 트렌드와 SERP 구조는 어떠한지를 확인할 수 있습니다.
          </p>
        </div>
      </motion.div>

      {/* 2. 키워드 후보 비교 (NEW) */}
      {keywordCandidates && keywordCandidates.length > 0 && (
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
          variants={cardVariants}
          custom={cardIndex++}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-violet-500" />
            <h4 className="text-sm font-semibold text-foreground">키워드 후보 비교</h4>
            <span className="text-xs text-muted-foreground">AI가 비교한 후보 키워드</span>
          </div>
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 pr-3 font-medium text-muted-foreground">키워드</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground whitespace-nowrap">PC</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground whitespace-nowrap">모바일</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground whitespace-nowrap">합계</th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground">경쟁도</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground whitespace-nowrap">SERP</th>
                  <th className="text-left py-2 pl-3 font-medium text-muted-foreground">판단</th>
                </tr>
              </thead>
              <tbody>
                {keywordCandidates.map((kc, i) => (
                  <tr
                    key={i}
                    className={`border-b border-gray-50 dark:border-gray-700/50 last:border-0 ${
                      kc.selected ? 'bg-blue-50/70 dark:bg-blue-900/15' : ''
                    }`}
                  >
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-1.5">
                        {kc.selected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                        <span className={`font-medium ${kc.selected ? 'text-blue-700 dark:text-blue-300' : 'text-foreground'}`}>
                          {kc.keyword}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-right text-muted-foreground whitespace-nowrap">
                      {kc.pcVolume !== undefined ? kc.pcVolume.toLocaleString() : '-'}
                    </td>
                    <td className="py-2 px-2 text-right text-muted-foreground whitespace-nowrap">
                      {kc.mobileVolume !== undefined ? kc.mobileVolume.toLocaleString() : '-'}
                    </td>
                    <td className="py-2 px-2 text-right font-medium whitespace-nowrap">
                      {kc.totalVolume !== undefined ? kc.totalVolume.toLocaleString() : '-'}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {kc.competition ? <CompetitionBadge value={kc.competition} /> : '-'}
                    </td>
                    <td className="py-2 px-2 text-right text-muted-foreground">
                      {kc.serpDifficulty !== undefined ? kc.serpDifficulty : '-'}
                    </td>
                    <td className="py-2 pl-3 text-muted-foreground max-w-[160px] truncate">
                      {kc.recommendation || kc.reason || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* 3. 메인 키워드 (ENHANCED) */}
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5"
        variants={cardVariants}
        custom={cardIndex++}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-foreground">메인 키워드</h3>
        </div>
        <div className="flex items-baseline gap-3 mb-5">
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {mainKeyword.keyword}
          </span>
          {mainKeyword.recommendation && (
            <span className="text-xs px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full font-medium">
              {mainKeyword.recommendation}
            </span>
          )}
        </div>

        {/* 검색량 지표 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {mainKeyword.pcVolume !== undefined && mainKeyword.mobileVolume !== undefined ? (
            <>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <p className="text-xs text-muted-foreground mb-1.5">PC 검색량</p>
                <p className="text-xl font-bold tabular-nums">{mainKeyword.pcVolume.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <p className="text-xs text-muted-foreground mb-1.5">모바일 검색량</p>
                <p className="text-xl font-bold tabular-nums">{mainKeyword.mobileVolume.toLocaleString()}</p>
              </div>
              {mainKeyword.monthlyVolume !== undefined && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-1.5 font-medium">월간 합계</p>
                  <p className="text-xl font-bold tabular-nums text-blue-700 dark:text-blue-300">{mainKeyword.monthlyVolume.toLocaleString()}</p>
                </div>
              )}
            </>
          ) : mainKeyword.monthlyVolume !== undefined ? (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-1.5 font-medium">월간 검색량</p>
              <p className="text-xl font-bold tabular-nums text-blue-700 dark:text-blue-300">{mainKeyword.monthlyVolume.toLocaleString()}</p>
            </div>
          ) : null}
        </div>

        {/* 경쟁도 & SERP 난이도 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {mainKeyword.competition && (
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
              <p className="text-xs text-muted-foreground mb-2">경쟁도</p>
              <CompetitionBadge value={mainKeyword.competition} />
            </div>
          )}
          {mainKeyword.serpDifficulty !== undefined && (
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 sm:col-span-2">
              <p className="text-xs text-muted-foreground mb-2">SERP 난이도</p>
              <DifficultyBar score={mainKeyword.serpDifficulty} />
            </div>
          )}
          {mainKeyword.ctr !== undefined && (
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
              <p className="text-xs text-muted-foreground mb-1.5">CTR</p>
              <p className="text-lg font-bold tabular-nums">{mainKeyword.ctr}%</p>
            </div>
          )}
          {mainKeyword.adCount !== undefined && (
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
              <p className="text-xs text-muted-foreground mb-1.5">광고 노출</p>
              <p className="text-lg font-bold tabular-nums">{mainKeyword.adCount}개</p>
            </div>
          )}
        </div>

        {/* PC/모바일 비율 바 */}
        {mainKeyword.pcVolume !== undefined && mainKeyword.mobileVolume !== undefined && (
          <MobileRatio pcVolume={mainKeyword.pcVolume} mobileVolume={mainKeyword.mobileVolume} />
        )}
        {mainKeyword.reason && (
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed border-t border-gray-100 dark:border-gray-700 pt-4">
            {mainKeyword.reason}
          </p>
        )}
      </motion.div>

      {/* 4. 트렌드 분석 (NEW) */}
      {trendData && trendData.length > 0 && (
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
          variants={cardVariants}
          custom={cardIndex++}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <h4 className="text-sm font-semibold text-foreground">트렌드 분석</h4>
            <span className="text-xs text-muted-foreground">검색량 추이</span>
          </div>
          <div className="space-y-4">
            {trendData.map((td, i) => (
              <div key={i}>
                <TrendChart dataPoints={td.dataPoints} keyword={td.keyword} />
                {td.summary && (
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{td.summary}</p>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 5. 검색 의도 (ENHANCED) */}
      {searchIntent && searchIntent.length > 0 && (
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
          variants={cardVariants}
          custom={cardIndex++}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center gap-2 mb-3">
            <Compass className="w-4 h-4 text-cyan-500" />
            <h4 className="text-sm font-semibold text-foreground">검색 의도 분석</h4>
          </div>
          <div className="space-y-3">
            {searchIntent.map((intent, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-foreground">{intent.type}</span>
                  <span className="text-xs font-semibold text-muted-foreground">{intent.percentage}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-1.5 bg-cyan-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${intent.percentage}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1 }}
                  />
                </div>
                {intent.keywords && intent.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {intent.keywords.map((kw, j) => (
                      <span key={j} className="px-1.5 py-0.5 text-[10px] bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 rounded">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
                {intent.contentDirection && (
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{intent.contentDirection}</p>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 7. 블로그 경쟁도 요약 */}
      {blogCompetition && (
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
          variants={cardVariants}
          custom={cardIndex++}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-violet-500" />
            <h4 className="text-sm font-semibold text-foreground">블로그 경쟁도</h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {blogCompetition.serpDifficulty !== undefined && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <p className="text-xs text-muted-foreground mb-1.5">SERP 난이도</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold tabular-nums">{blogCompetition.serpDifficulty}</span>
                  <span className="text-xs text-muted-foreground">/100</span>
                  {blogCompetition.serpDifficultyLevel && (
                    <DifficultyLevelBadge level={blogCompetition.serpDifficultyLevel} score={blogCompetition.serpDifficulty} />
                  )}
                </div>
              </div>
            )}
            {blogCompetition.level && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <p className="text-xs text-muted-foreground mb-2">경쟁 등급</p>
                <CompetitionBadge value={blogCompetition.level} />
              </div>
            )}
            {blogCompetition.totalResults !== undefined && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <p className="text-xs text-muted-foreground mb-1.5">총 검색 결과</p>
                <p className="text-lg font-bold tabular-nums">{blogCompetition.totalResults.toLocaleString()}</p>
              </div>
            )}
            {blogCompetition.attackability !== undefined && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <p className="text-xs text-muted-foreground mb-1.5">공략 가능성</p>
                <div className="flex items-center gap-1.5">
                  {blogCompetition.attackability ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className="text-base font-semibold">
                    {blogCompetition.attackability ? '가능' : '어려움'}
                  </span>
                </div>
              </div>
            )}
          </div>
          {(blogCompetition.avgWordCount !== undefined || blogCompetition.avgImageCount !== undefined) && (
            <div className="grid grid-cols-2 gap-3 mb-3">
              {blogCompetition.avgWordCount !== undefined && (
                <div className="flex items-center justify-between text-sm p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                  <span className="text-xs text-muted-foreground">상위글 평균 글자수</span>
                  <span className="font-semibold tabular-nums">{blogCompetition.avgWordCount.toLocaleString()}자</span>
                </div>
              )}
              {blogCompetition.avgImageCount !== undefined && (
                <div className="flex items-center justify-between text-sm p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                  <span className="text-xs text-muted-foreground">상위글 평균 이미지</span>
                  <span className="font-semibold tabular-nums">{blogCompetition.avgImageCount}개</span>
                </div>
              )}
            </div>
          )}
          {blogCompetition.attackabilityReason && (
            <p className="text-xs text-muted-foreground leading-relaxed border-t border-gray-100 dark:border-gray-700 pt-2">
              {blogCompetition.attackabilityReason}
            </p>
          )}
          {blogCompetition.strategy && blogCompetition.strategy.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs font-medium text-foreground mb-1.5">공략 전략</p>
              <div className="space-y-1">
                {blogCompetition.strategy.map((s, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs">
                    <span className="text-violet-500 mt-0.5 flex-shrink-0">{i + 1}.</span>
                    <span className="text-muted-foreground leading-relaxed">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* 상위 경쟁 블로그 (접기/펼치기) */}
          {serpCompetitors && serpCompetitors.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setShowCompetitors(v => !v)}
                className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-medium">상위 경쟁 블로그 {serpCompetitors.length}개</span>
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showCompetitors ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showCompetitors && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="overflow-x-auto mt-2">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left py-2 pr-2 font-medium text-muted-foreground">#</th>
                            <th className="text-left py-2 pr-2 font-medium text-muted-foreground">제목</th>
                            <th className="text-right py-2 pr-2 font-medium text-muted-foreground whitespace-nowrap">글자수</th>
                            <th className="text-right py-2 pr-2 font-medium text-muted-foreground whitespace-nowrap">이미지</th>
                            <th className="text-right py-2 font-medium text-muted-foreground whitespace-nowrap">경과일</th>
                          </tr>
                        </thead>
                        <tbody>
                          {serpCompetitors.map((comp, i) => (
                            <tr key={i} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                              <td className="py-2 pr-2 text-muted-foreground font-medium">{comp.rank}</td>
                              <td className="py-2 pr-2 text-foreground max-w-[200px] truncate">
                                {comp.title}
                                {comp.features && (
                                  <span className="ml-1 text-muted-foreground">({comp.features})</span>
                                )}
                              </td>
                              <td className="py-2 pr-2 text-right text-muted-foreground whitespace-nowrap">
                                {comp.wordCount ? `${comp.wordCount.toLocaleString()}자` : '-'}
                              </td>
                              <td className="py-2 pr-2 text-right text-muted-foreground whitespace-nowrap">
                                {comp.imageCount !== undefined ? `${comp.imageCount}장` : '-'}
                              </td>
                              <td className="py-2 text-right text-muted-foreground whitespace-nowrap">
                                {comp.freshnessDays !== undefined ? `${comp.freshnessDays}일` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      )}

      {/* 9. 타이틀 추천 (ENHANCED) */}
      {titleOptions && titleOptions.length > 0 && (
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
          variants={cardVariants}
          custom={cardIndex++}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center gap-2 mb-3">
            <Type className="w-4 h-4 text-amber-500" />
            <h4 className="text-sm font-semibold text-foreground">타이틀 추천</h4>
          </div>
          <div className="space-y-2.5">
            {titleOptions.map((opt, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border ${
                  opt.selected
                    ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10'
                    : 'border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50'
                }`}
              >
                <div className="flex items-start gap-2">
                  {opt.selected && (
                    <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${opt.selected ? 'text-blue-700 dark:text-blue-300' : 'text-foreground'}`}>
                      {opt.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {opt.length && (
                        <span className="text-xs text-muted-foreground">{opt.length}자</span>
                      )}
                      {opt.ctrEstimate && (
                        <span className="text-xs px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
                          CTR {opt.ctrEstimate}
                        </span>
                      )}
                      {opt.targetIntent && (
                        <span className="text-xs text-muted-foreground">{opt.targetIntent}</span>
                      )}
                      {opt.reasoning && (
                        <span className="text-xs text-muted-foreground">{opt.reasoning}</span>
                      )}
                    </div>
                    {opt.keywordCoverage && opt.keywordCoverage.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {opt.keywordCoverage.map((kw, j) => (
                          <span key={j} className="px-1.5 py-0.5 text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 10. 서브 키워드 + 트렌드 키워드 */}
      <div className={`grid grid-cols-1 gap-4 ${subKeywords?.length && trendKeywords?.length ? 'md:grid-cols-2' : ''}`}>
        {subKeywords && subKeywords.length > 0 && (
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
            variants={cardVariants}
            custom={cardIndex++}
            initial="hidden"
            animate="visible"
          >
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4 text-purple-500" />
              <h4 className="text-sm font-semibold text-foreground">서브 키워드</h4>
            </div>
            {/* 컬럼 헤더 */}
            <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs text-muted-foreground">키워드</span>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="w-16 text-right">월간 검색량</span>
                <span className="w-10 text-center">경쟁도</span>
              </div>
            </div>
            <div className="space-y-2">
              {subKeywords.map((kw, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground">{kw.keyword}</span>
                    {kw.reason && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{kw.reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 ml-2 flex-shrink-0">
                    {kw.monthlyVolume !== undefined ? (
                      <span className="text-xs font-medium text-foreground w-16 text-right">{kw.monthlyVolume.toLocaleString()}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground w-16 text-right">-</span>
                    )}
                    <span className="w-10 flex justify-center">
                      {kw.competition ? <CompetitionBadge value={kw.competition} /> : <span className="text-xs text-muted-foreground">-</span>}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {trendKeywords && trendKeywords.length > 0 && (
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
            variants={cardVariants}
            custom={cardIndex++}
            initial="hidden"
            animate="visible"
          >
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-orange-500" />
              <h4 className="text-sm font-semibold text-foreground">트렌드 키워드</h4>
            </div>
            {/* 컬럼 헤더 */}
            <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs text-muted-foreground">키워드</span>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="w-16 text-right">월간 검색량</span>
                <span className="w-10 text-center">경쟁도</span>
              </div>
            </div>
            <div className="space-y-2">
              {trendKeywords.map((kw, i) => (
                <div key={i} className="py-1.5 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{kw.keyword}</span>
                      {kw.trend && (
                        <span className="text-xs px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded">
                          {kw.trend}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 ml-2 flex-shrink-0">
                      {kw.monthlyVolume !== undefined ? (
                        <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 w-16 text-right">
                          {kw.monthlyVolume.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground w-16 text-right">-</span>
                      )}
                      <span className="w-10 flex justify-center">
                        {kw.competition ? <CompetitionBadge value={kw.competition} /> : <span className="text-xs text-muted-foreground">-</span>}
                      </span>
                    </div>
                  </div>
                  {kw.insight && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{kw.insight}</p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* 쇼핑 데이터 */}
      {shoppingData && (
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
          variants={cardVariants}
          custom={cardIndex++}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart className="w-4 h-4 text-pink-500" />
            <h4 className="text-sm font-semibold text-foreground">쇼핑 데이터</h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {shoppingData.totalProducts !== undefined && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <p className="text-xs text-muted-foreground mb-1.5">검색 제품 수</p>
                <p className="text-lg font-bold tabular-nums">{shoppingData.totalProducts}개</p>
              </div>
            )}
            {shoppingData.averagePrice !== undefined && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <p className="text-xs text-muted-foreground mb-1.5">평균 가격</p>
                <p className="text-lg font-bold tabular-nums">{shoppingData.averagePrice.toLocaleString()}원</p>
              </div>
            )}
            {shoppingData.medianPrice !== undefined && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <p className="text-xs text-muted-foreground mb-1.5">중앙값</p>
                <p className="text-lg font-bold tabular-nums">{shoppingData.medianPrice.toLocaleString()}원</p>
              </div>
            )}
            {shoppingData.priceRange && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <p className="text-xs text-muted-foreground mb-1.5">가격 범위</p>
                <p className="text-base font-bold tabular-nums">
                  {shoppingData.priceRange.min.toLocaleString()}~{shoppingData.priceRange.max.toLocaleString()}원
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* 15. 인사이트 & 리스크 */}
      {((insights && insights.length > 0) || (risks && risks.length > 0)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights && insights.length > 0 && (
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
              variants={cardVariants}
              custom={cardIndex++}
              initial="hidden"
              animate="visible"
            >
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                <h4 className="text-sm font-semibold text-foreground">인사이트</h4>
              </div>
              <div className="space-y-2">
                {insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Star className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground leading-relaxed">{insight}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {risks && risks.length > 0 && (
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
              variants={cardVariants}
              custom={cardIndex++}
              initial="hidden"
              animate="visible"
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h4 className="text-sm font-semibold text-foreground">위험 요소</h4>
              </div>
              <div className="space-y-2">
                {risks.map((risk, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground leading-relaxed">{risk}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}
