export type AgeGroup =
  | 'infant' // 0–2 岁
  | 'toddler' // 3–5 岁
  | 'child' // 6–12 岁
  | 'teenager' // 13–17 岁
  | 'youth' // 18–35 岁
  | 'adult' // 36–55 岁
  | 'elder' // 56 岁及以上

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  infant: '婴儿',
  toddler: '幼儿',
  child: '儿童',
  teenager: '青少年',
  youth: '青年',
  adult: '成人',
  elder: '老年',
}

/** 75 岁起每年判定自然死亡 */
export const DEATH_PROBABILITY_START_AGE = 75

export function getAgeGroup(age: number): AgeGroup {
  if (age <= 2) return 'infant'
  if (age <= 5) return 'toddler'
  if (age <= 12) return 'child'
  if (age <= 17) return 'teenager'
  if (age <= 35) return 'youth'
  if (age <= 55) return 'adult'
  return 'elder'
}

/** 12 岁及以下视为年幼，不可生育等 */
export function isChildAge(age: number): boolean {
  return age <= 12
}

/** 75 岁起概率递增，约 108 岁封顶 50% */
export function getAnnualDeathProbability(age: number): number {
  if (age < DEATH_PROBABILITY_START_AGE) return 0
  const yearsPast = age - DEATH_PROBABILITY_START_AGE
  return Math.min(0.5, 0.01 + yearsPast * 0.015)
}

export type AvatarVisualGroup = 'child' | 'youth' | 'adult' | 'elder'

/** 头像 SVG 仅四套造型，逻辑年龄段映射到视觉档 */
export function getAvatarVisualGroup(age: number): AvatarVisualGroup {
  const group = getAgeGroup(age)
  if (group === 'infant' || group === 'toddler' || group === 'child') return 'child'
  if (group === 'teenager' || group === 'youth') return 'youth'
  if (group === 'adult') return 'adult'
  return 'elder'
}
