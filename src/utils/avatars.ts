import type { Gender } from '../types/game'

export type AgeGroup = 'child' | 'youth' | 'adult' | 'elder'

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  child: '幼年',
  youth: '青年',
  adult: '壮年',
  elder: '暮年',
}

const AVATAR_PREFIX = 'av:'

export function getAgeGroup(age: number): AgeGroup {
  if (age <= 12) return 'child'
  if (age <= 25) return 'youth'
  if (age <= 50) return 'adult'
  return 'elder'
}

export function makeAvatarId(
  gender: Gender,
  ageGroup: AgeGroup,
  variant: number,
): string {
  const g = gender === 'male' ? 'm' : 'f'
  return `${AVATAR_PREFIX}${g}:${ageGroup}:${variant}`
}

export function parseAvatarId(
  id: string,
): { gender: Gender; ageGroup: AgeGroup; variant: number } | null {
  if (!id.startsWith(AVATAR_PREFIX)) return null
  const parts = id.slice(AVATAR_PREFIX.length).split(':')
  if (parts.length !== 3) return null
  const [g, ageGroup, variantStr] = parts
  if (g !== 'm' && g !== 'f') return null
  if (!['child', 'youth', 'adult', 'elder'].includes(ageGroup)) return null
  const variant = Number(variantStr)
  if (!Number.isInteger(variant) || variant < 0 || variant > 2) return null
  return {
    gender: g === 'm' ? 'male' : 'female',
    ageGroup: ageGroup as AgeGroup,
    variant,
  }
}

export function isGeneratedAvatar(id: string): boolean {
  return id.startsWith(AVATAR_PREFIX)
}

export function getAvatarOptions(gender: Gender, age: number): string[] {
  const ageGroup = getAgeGroup(age)
  return [0, 1, 2].map((v) => makeAvatarId(gender, ageGroup, v))
}

interface AvatarPalette {
  skin: string
  hair: string
  shirt: string
  accent: string
}

function palette(gender: Gender, ageGroup: AgeGroup, variant: number): AvatarPalette {
  const skins = ['#f0d5be', '#ddb896', '#c68642']
  const hairMale = ['#2c1810', '#5c3d2e', '#1a1a2e']
  const hairFemale = ['#2c1810', '#8b5a3c', '#c9a66b']
  const shirts = ['#4a5568', '#744210', '#2d3748']
  const accents = ['#c9a84c', '#9b7653', '#718096']

  const hairBase = gender === 'male' ? hairMale : hairFemale
  let hair = hairBase[variant] ?? hairBase[0]
  if (ageGroup === 'elder') hair = '#9ca3af'

  return {
    skin: skins[variant] ?? skins[0],
    hair,
    shirt: shirts[variant] ?? shirts[0],
    accent: accents[variant] ?? accents[0],
  }
}

function headRadius(ageGroup: AgeGroup): number {
  if (ageGroup === 'child') return 17
  if (ageGroup === 'elder') return 15
  return 16
}

function buildAvatarSvg(gender: Gender, ageGroup: AgeGroup, variant: number): string {
  const { skin, hair, shirt, accent } = palette(gender, ageGroup, variant)
  const r = headRadius(ageGroup)
  const cx = 32
  const cy = ageGroup === 'child' ? 28 : 26

  const hairPaths: Record<string, string[]> = {
    'male-child': [
      `<ellipse cx="${cx}" cy="${cy - 4}" rx="${r + 1}" ry="${r - 2}" fill="${hair}"/>`,
    ],
    'female-child': [
      `<ellipse cx="${cx}" cy="${cy - 3}" rx="${r + 2}" ry="${r - 1}" fill="${hair}"/>`,
      `<ellipse cx="${cx - 12}" cy="${cy + 4}" rx="5" ry="8" fill="${hair}"/>`,
      `<ellipse cx="${cx + 12}" cy="${cy + 4}" rx="5" ry="8" fill="${hair}"/>`,
    ],
    'male-youth': [
      `<path d="M${cx - r - 1} ${cy} Q${cx} ${cy - r - 8} ${cx + r + 1} ${cy} L${cx + r} ${cy + 6} Q${cx} ${cy + 2} ${cx - r} ${cy + 6}Z" fill="${hair}"/>`,
    ],
    'female-youth': [
      `<ellipse cx="${cx}" cy="${cy - 2}" rx="${r + 2}" ry="${r}" fill="${hair}"/>`,
      `<path d="M${cx - r - 2} ${cy} Q${cx - 14} ${cy + 18} ${cx - 10} ${cy + 28} L${cx - 6} ${cy + 14}Z" fill="${hair}"/>`,
      `<path d="M${cx + r + 2} ${cy} Q${cx + 14} ${cy + 18} ${cx + 10} ${cy + 28} L${cx + 6} ${cy + 14}Z" fill="${hair}"/>`,
    ],
    'male-adult': [
      `<path d="M${cx - r - 1} ${cy - 2} Q${cx} ${cy - r - 6} ${cx + r + 1} ${cy - 2} L${cx + r + 1} ${cy + 4} Q${cx} ${cy} ${cx - r - 1} ${cy + 4}Z" fill="${hair}"/>`,
      variant >= 1
        ? `<path d="M${cx - 10} ${cy + 10} Q${cx} ${cy + 16} ${cx + 10} ${cy + 10} L${cx + 8} ${cy + 14} Q${cx} ${cy + 18} ${cx - 8} ${cy + 14}Z" fill="${hair}" opacity="0.55"/>`
        : '',
    ],
    'female-adult': [
      `<ellipse cx="${cx}" cy="${cy - 3}" rx="${r + 1}" ry="${r - 1}" fill="${hair}"/>`,
      `<path d="M${cx - r} ${cy} C${cx - 16} ${cy + 10} ${cx - 12} ${cy + 26} ${cx - 8} ${cy + 22} L${cx - 4} ${cy + 8}Z" fill="${hair}"/>`,
      `<path d="M${cx + r} ${cy} C${cx + 16} ${cy + 10} ${cx + 12} ${cy + 26} ${cx + 8} ${cy + 22} L${cx + 4} ${cy + 8}Z" fill="${hair}"/>`,
    ],
    'male-elder': [
      `<path d="M${cx - r} ${cy - 1} Q${cx} ${cy - r - 4} ${cx + r} ${cy - 1} L${cx + r} ${cy + 5} Q${cx} ${cy + 1} ${cx - r} ${cy + 5}Z" fill="${hair}"/>`,
      `<path d="M${cx - 8} ${cy + 12} L${cx - 4} ${cy + 16} M${cx + 8} ${cy + 12} L${cx + 4} ${cy + 16}" stroke="${hair}" stroke-width="1.2" fill="none" opacity="0.7"/>`,
    ],
    'female-elder': [
      `<ellipse cx="${cx}" cy="${cy - 2}" rx="${r + 1}" ry="${r - 2}" fill="${hair}"/>`,
      `<path d="M${cx - r} ${cy + 2} Q${cx - 10} ${cy + 20} ${cx - 6} ${cy + 18} L${cx - 2} ${cy + 6}Z" fill="${hair}"/>`,
      `<path d="M${cx + r} ${cy + 2} Q${cx + 10} ${cy + 20} ${cx + 6} ${cy + 18} L${cx + 2} ${cy + 6}Z" fill="${hair}"/>`,
    ],
  }

  const hairKey = `${gender}-${ageGroup}`
  const hairLayer = (hairPaths[hairKey] ?? hairPaths['male-adult']).join('')

  const elderLines =
    ageGroup === 'elder'
      ? `<path d="M${cx - 6} ${cy + 2} L${cx - 2} ${cy + 4} M${cx + 6} ${cy + 2} L${cx + 2} ${cy + 4}" stroke="#9ca3af" stroke-width="0.8" fill="none" opacity="0.5"/>`
      : ''

  const blush =
    gender === 'female' && ageGroup !== 'elder'
      ? `<ellipse cx="${cx - 9}" cy="${cy + 6}" rx="3" ry="2" fill="#e8a598" opacity="0.35"/><ellipse cx="${cx + 9}" cy="${cy + 6}" rx="3" ry="2" fill="#e8a598" opacity="0.35"/>`
      : ''

  const accessory =
    variant === 2
      ? `<circle cx="${cx}" cy="${cy - r - 2}" r="3" fill="${accent}" stroke="#fff" stroke-width="0.5"/>`
      : ''

  const mouthCurveY = ageGroup === 'child' ? 10 : 9

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="8" fill="#1a1814"/>
  <path d="M16 58 Q32 52 48 58 L48 64 L16 64Z" fill="${shirt}"/>
  <circle cx="${cx}" cy="${cy + 2}" r="${r}" fill="${skin}"/>
  ${hairLayer}
  <circle cx="${cx - 5}" cy="${cy}" r="2" fill="#2d3748"/>
  <circle cx="${cx + 5}" cy="${cy}" r="2" fill="#2d3748"/>
  <circle cx="${cx - 4.5}" cy="${cy - 0.5}" r="0.6" fill="#fff"/>
  <circle cx="${cx + 5.5}" cy="${cy - 0.5}" r="0.6" fill="#fff"/>
  <path d="M${cx - 3} ${cy + 8} Q${cx} ${cy + mouthCurveY} ${cx + 3} ${cy + 8}" stroke="#b08968" stroke-width="1.2" fill="none" stroke-linecap="round"/>
  ${blush}
  ${elderLines}
  ${accessory}
</svg>`
}

export function avatarIdToDataUrl(id: string): string | null {
  const parsed = parseAvatarId(id)
  if (!parsed) return null
  const svg = buildAvatarSvg(parsed.gender, parsed.ageGroup, parsed.variant)
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export function avatarIdToSvgString(id: string): string | null {
  const parsed = parseAvatarId(id)
  if (!parsed) return null
  return buildAvatarSvg(parsed.gender, parsed.ageGroup, parsed.variant)
}
