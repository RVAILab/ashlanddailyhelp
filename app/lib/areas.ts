import type { Messages } from '../i18n/en.ts'

export const areaName = (area: string, t: Messages): string => t.areas[area] ?? area
