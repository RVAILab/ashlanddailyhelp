import { describe, expect, it } from 'vitest'
import { textOnly } from './text-mode.ts'

const headers = (values: Record<string, string>) => new Headers(values)

describe('textOnly', () => {
  it('follows the visitor’s choice, and Save-Data when there is none', () => {
    expect(textOnly(headers({}))).toBe(false)
    expect(textOnly(headers({ 'Save-Data': 'on' }))).toBe(true)
    expect(textOnly(headers({ Cookie: 'lang=en; text=on' }))).toBe(true)
    expect(textOnly(headers({ Cookie: 'text=off', 'Save-Data': 'on' }))).toBe(false)
  })
})
