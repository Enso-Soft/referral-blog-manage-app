'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useLanguage } from './LanguageProvider'
import { ScrollReveal } from './ScrollReveal'
import type { TranslationKey } from './translations'

const faqItems: { q: TranslationKey; a: TranslationKey }[] = [
  { q: 'faq.q1', a: 'faq.a1' },
  { q: 'faq.q2', a: 'faq.a2' },
  { q: 'faq.q3', a: 'faq.a3' },
  { q: 'faq.q4', a: 'faq.a4' },
  { q: 'faq.q5', a: 'faq.a5' },
  { q: 'faq.q6', a: 'faq.a6' },
]

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <ScrollReveal delay={index * 0.05}>
      <div className="border-b border-border last:border-0">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between py-5 text-left group"
        >
          <span className="text-base sm:text-lg font-semibold text-foreground pr-4">{q}</span>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 text-muted-foreground group-hover:text-foreground transition-colors"
          >
            <ChevronDown className="w-5 h-5" />
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <p className="pb-5 text-muted-foreground leading-relaxed pr-10">
                {a}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ScrollReveal>
  )
}

export function FaqSection() {
  const { t } = useLanguage()

  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            {t('faq.title')}
          </h2>
        </ScrollReveal>

        <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
          {faqItems.map((item, i) => (
            <FaqItem key={item.q} q={t(item.q)} a={t(item.a)} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
