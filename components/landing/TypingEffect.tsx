'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useInView } from 'framer-motion'

interface TypingEffectProps {
  text: string
  speed?: number
  className?: string
  onComplete?: () => void
}

export function TypingEffect({
  text,
  speed = 50,
  className,
  onComplete,
}: TypingEffectProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const [displayed, setDisplayed] = useState('')
  const completedRef = useRef(false)

  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (!isInView || completedRef.current) return

    let i = 0
    setDisplayed('')
    const interval = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(interval)
        completedRef.current = true
        onCompleteRef.current?.()
      }
    }, speed)

    return () => clearInterval(interval)
  }, [isInView, text, speed])

  return (
    <span ref={ref} className={className}>
      {displayed.split('\n').map((line, i, arr) => (
        <span key={i}>
          {line}
          {i < arr.length - 1 && <br />}
        </span>
      ))}
      {displayed.length < text.length && (
        <span className="inline-block w-[2px] h-[1em] bg-current animate-pulse ml-0.5 align-text-bottom" />
      )}
    </span>
  )
}
