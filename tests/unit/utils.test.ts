import { describe, it, expect } from 'vitest'
import { countContentChars, toDate, formatDate } from '@/lib/utils'

describe('countContentChars', () => {
  it('HTML 태그 제거 후 글자 수', () => {
    expect(countContentChars('<p>Hello World</p>')).toBe(10) // 'HelloWorld' (공백 제거)
  })

  it('빈 문자열', () => {
    expect(countContentChars('')).toBe(0)
  })

  it('중첩 태그', () => {
    expect(countContentChars('<div><p>테스트</p></div>')).toBe(3)
  })

  it('공백만 있는 태그', () => {
    expect(countContentChars('<p>   </p>')).toBe(0)
  })
})

describe('toDate', () => {
  it('Date 객체 반환', () => {
    const date = new Date('2024-01-01')
    expect(toDate(date)).toEqual(date)
  })

  it('_seconds 형식', () => {
    const result = toDate({ _seconds: 1704067200, _nanoseconds: 0 })
    expect(result).toBeInstanceOf(Date)
  })

  it('seconds 형식', () => {
    const result = toDate({ seconds: 1704067200, nanoseconds: 0 })
    expect(result).toBeInstanceOf(Date)
  })

  it('null → null', () => {
    expect(toDate(null)).toBeNull()
  })

  it('undefined → null', () => {
    expect(toDate(undefined)).toBeNull()
  })

  it('잘못된 값 → null', () => {
    expect(toDate('not-a-date')).toBeNull()
  })
})
