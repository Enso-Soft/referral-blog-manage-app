'use client'

import { ArrowRight } from 'lucide-react'
import { useLanguage } from './LanguageProvider'
import { ScrollReveal } from './ScrollReveal'

const STUDIO_URL = 'https://studio.ensoft.me'

export function FooterSection() {
  const { t } = useLanguage()

  return (
    <footer className="bg-gray-950 text-white">
      {/* CTA section */}
      <div className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
              {t('footer.cta')}
            </h2>
            <p className="text-lg text-gray-400 mb-8">
              {t('footer.cta.desc')}
            </p>
            <a
              href={STUDIO_URL}
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-bold bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 shadow-xl shadow-violet-500/25 transition-all hover:scale-105"
            >
              {t('footer.cta.button')}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
          </ScrollReveal>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-gray-500">
            {t('footer.copyright')}
          </span>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-gray-300 transition-colors">
              {t('footer.terms')}
            </a>
            <a href="#" className="hover:text-gray-300 transition-colors">
              {t('footer.privacy')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
