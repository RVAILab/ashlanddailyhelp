import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('app/app.css', 'utf8')

function tokens(block: string) {
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\b/gi)].map(([, name, hex]) => [name, hex]))
}

const light = tokens(css.match(/^:root \{([^}]*)\}/m)?.[1] ?? '')
const dark = {
  ...light,
  ...tokens(css.match(/@media \(prefers-color-scheme: dark\) \{\s*:root \{([^}]*)\}/)?.[1] ?? ''),
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map(at => {
    const channel = Number.parseInt(hex.slice(at, at + 2), 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0)
}

function contrast(a: string, b: string) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05)
}

const text = ['ink', 'muted', 'accent', 'warning', 'caution', 'heading', 'clay', 'moss']
const surfaces = ['paper', 'card']

describe.each([
  ['light', light],
  ['dark', dark],
])('%s theme', (_, theme) => {
  it.each(text.flatMap(fg => surfaces.map(bg => [fg, bg])))('%s text on %s reads at 4.5:1', (fg, bg) => {
    expect(contrast(theme[fg], theme[bg])).toBeGreaterThanOrEqual(4.5)
  })

  it('button text on the accent reads at 4.5:1, and the footer text on its band', () => {
    expect(contrast(theme['on-accent'], theme.accent)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(theme['footer-ink'], theme.footer)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(theme['footer-link'], theme.footer)).toBeGreaterThanOrEqual(4.5)
  })

  it('field borders and focus rings stand out at 3:1', () => {
    for (const bg of surfaces) {
      expect(contrast(theme.field, theme[bg])).toBeGreaterThanOrEqual(3)
      expect(contrast(theme.focus, theme[bg])).toBeGreaterThanOrEqual(3)
    }
  })
})
