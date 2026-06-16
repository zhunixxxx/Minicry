const STORAGE_KEY = 'minicry:deepseek-api-key'

export function loadAiApiKey(): string | undefined {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)?.trim()
    if (stored) return stored
  } catch {
    // private browsing or storage disabled
  }
  return import.meta.env.VITE_DEEPSEEK_API_KEY?.trim() || undefined
}

export function saveAiApiKey(key: string): void {
  try {
    const trimmed = key.trim()
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // quota exceeded or private browsing — silently ignore
  }
}

export function clearAiApiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // silently ignore
  }
}

export function maskApiKey(key: string): string {
  const trimmed = key.trim()
  if (!trimmed) return ''
  if (trimmed.length <= 8) return '••••••••'
  return `${trimmed.slice(0, 3)}${'•'.repeat(6)}${trimmed.slice(-4)}`
}
