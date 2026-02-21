'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { buildCategoryTree, type CategoryNode, type PerSiteData, itemVariants } from './wp-helpers'

interface WPCategoryTreeProps {
  selectedSiteIds: string[]
  sortedSelectedSiteIds: string[]
  perSiteData: Record<string, PerSiteData>
  activeCategoryTab: string | null
  collapsedGroups: Set<number>
  anySiteLoading: boolean
  getSiteName: (siteId: string) => string
  onActiveCategoryTabChange: (siteId: string) => void
  onCategoryToggle: (siteId: string, catId: number) => void
  onToggleGroup: (catId: number) => void
}

export function WPCategoryTree({
  selectedSiteIds,
  sortedSelectedSiteIds,
  perSiteData,
  activeCategoryTab,
  collapsedGroups,
  anySiteLoading,
  getSiteName,
  onActiveCategoryTabChange,
  onCategoryToggle,
  onToggleGroup,
}: WPCategoryTreeProps) {
  const sitesWithCategories = selectedSiteIds.filter(id => {
    const data = perSiteData[id]
    return data && data.categories.length > 0
  })

  if (sitesWithCategories.length === 0 && !anySiteLoading) return null

  const targetSiteId = selectedSiteIds.length >= 2
    ? activeCategoryTab
    : selectedSiteIds[0]

  const renderContent = () => {
    if (!targetSiteId) return null
    const data = perSiteData[targetSiteId]
    if (!data || data.categories.length === 0) return null

    const tree = buildCategoryTree(data.categories)

    const countSelectedChildren = (node: CategoryNode): number => {
      let count = 0
      for (const child of node.children) {
        if (data.selectedCategories.includes(child.id)) count++
        count += countSelectedChildren(child)
      }
      return count
    }

    const renderChip = (node: CategoryNode, isGroupParent?: boolean) => {
      const isSelected = data.selectedCategories.includes(node.id)
      return (
        <Button
          key={node.id}
          variant="outline"
          type="button"
          onClick={() => onCategoryToggle(targetSiteId, node.id)}
          className={`px-3 py-1.5 h-auto text-sm rounded-full transition-colors ${
            isSelected
              ? 'bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 hover:text-white'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          } ${isGroupParent && !isSelected ? 'font-medium' : ''}`}
        >
          {node.name}
        </Button>
      )
    }

    const renderGroup = (node: CategoryNode, depth: number): React.ReactNode => {
      const leaves = node.children.filter(c => c.children.length === 0)
      const branches = node.children.filter(c => c.children.length > 0)
      const isCollapsed = collapsedGroups.has(node.id)
      const selectedChildCount = countSelectedChildren(node)

      return (
        <div
          key={node.id}
          className={`p-2 rounded-lg border ${
            depth === 0
              ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700/50'
              : 'bg-white/60 dark:bg-gray-800/30 border-gray-200/60 dark:border-gray-600/30'
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            {renderChip(node, true)}
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={() => onToggleGroup(node.id)}
              className="h-auto w-auto p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-transparent"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
            </Button>
            {isCollapsed && selectedChildCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                {selectedChildCount}개 선택
              </span>
            )}
            {!isCollapsed && leaves.length > 0 && (
              <>
                <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 flex-shrink-0" />
                {leaves.map(leaf => renderChip(leaf))}
              </>
            )}
          </div>
          {!isCollapsed && branches.length > 0 && (
            <div className="space-y-1.5 ml-3 mt-1.5">
              {branches.map(b => renderGroup(b, depth + 1))}
            </div>
          )}
        </div>
      )
    }

    const standalone = tree.filter(n => n.children.length === 0)
    const groups = tree.filter(n => n.children.length > 0)

    const selectedCatNames = data.selectedCategories.map(id => {
      const cat = data.categories.find(c => c.id === id)
      return cat ? { id, name: cat.name } : null
    }).filter(Boolean) as { id: number; name: string }[]

    return (
      <div className="space-y-2">
        {/* Selected summary chips */}
        {selectedCatNames.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-gray-400 dark:text-gray-500 mr-0.5">선택됨</span>
            {selectedCatNames.map(cat => (
              <span
                key={cat.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full"
              >
                {cat.name}
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => onCategoryToggle(targetSiteId, cat.id)}
                  className="h-auto w-auto p-0 hover:text-blue-900 dark:hover:text-blue-100 hover:bg-transparent"
                >
                  <X className="w-3 h-3" />
                </Button>
              </span>
            ))}
          </div>
        )}

        {/* Category tree */}
        <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
          {standalone.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {standalone.map(cat => renderChip(cat))}
            </div>
          )}
          {groups.map(node => renderGroup(node, 0))}
        </div>
      </div>
    )
  }

  return (
    <motion.div variants={itemVariants}>
      <Label className="block text-sm font-medium mb-2">
        카테고리
      </Label>

      {/* Multi-site: Underline tab bar */}
      {selectedSiteIds.length >= 2 && sitesWithCategories.length > 0 && (
        <div className="overflow-x-auto scrollbar-hide mb-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            {sortedSelectedSiteIds.map(siteId => {
              const data = perSiteData[siteId]
              if (!data || data.categories.length === 0) return null
              const isActive = activeCategoryTab === siteId
              const selectedCount = data.selectedCategories.length
              return (
                <Button
                  key={siteId}
                  variant="ghost"
                  onClick={() => onActiveCategoryTabChange(siteId)}
                  className={`flex items-center gap-1.5 px-3 pb-2 pt-1 h-auto text-xs font-medium whitespace-nowrap rounded-none border-b-2 transition-colors
                    ${isActive
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
                    }`}
                >
                  {getSiteName(siteId)}
                  {selectedCount > 0 && (
                    <span className={`inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold rounded-full
                      ${isActive
                        ? 'bg-indigo-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300'
                      }`}>
                      {selectedCount}
                    </span>
                  )}
                </Button>
              )
            })}
          </div>
        </div>
      )}

      {renderContent()}
    </motion.div>
  )
}
