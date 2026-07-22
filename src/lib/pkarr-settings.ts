import { RESOLVE_POLICY_NAMES, type ResolvePolicyName } from "@/lib/resolve-policy"

const SETTINGS_STORAGE_KEY = "pkarr-settings-v1"

export interface PkarrSettings {
  resolvePolicy: ResolvePolicyName
  relays: string[]
}

export const DEFAULT_PKARR_SETTINGS: PkarrSettings = {
  resolvePolicy: "cache-first",
  relays: [],
}

export function loadPkarrSettings(): PkarrSettings {
  if (typeof window === "undefined") return { ...DEFAULT_PKARR_SETTINGS }

  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!stored) return { ...DEFAULT_PKARR_SETTINGS }

    const settings = JSON.parse(stored) as Partial<PkarrSettings>
    if (!isResolvePolicyName(settings.resolvePolicy) || !Array.isArray(settings.relays)) {
      return { ...DEFAULT_PKARR_SETTINGS }
    }

    return {
      resolvePolicy: settings.resolvePolicy,
      relays: parseRelayInput(
        settings.relays.filter((relay): relay is string => typeof relay === "string").join("\n")
      ),
    }
  } catch {
    return { ...DEFAULT_PKARR_SETTINGS }
  }
}

export function savePkarrSettings(settings: PkarrSettings): void {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}

export function clearPkarrSettings(): void {
  localStorage.removeItem(SETTINGS_STORAGE_KEY)
}

export function parseRelayInput(input: string): string[] {
  const relays = input
    .split(/[\n,]/)
    .map((relay) => relay.trim())
    .filter(Boolean)
    .map(normalizeRelayUrl)

  return Array.from(new Set(relays))
}

export function formatRelayInput(relays: string[]): string {
  return relays.join("\n")
}

export function environmentRelays(): string[] {
  return process.env.NEXT_PUBLIC_PKARR_RELAYS
    ?.split(",")
    .map((relay) => relay.trim())
    .filter(Boolean) ?? []
}

function isResolvePolicyName(value: unknown): value is ResolvePolicyName {
  return RESOLVE_POLICY_NAMES.includes(value as ResolvePolicyName)
}

function normalizeRelayUrl(relay: string): string {
  let url: URL

  try {
    url = new URL(relay)
  } catch {
    throw new Error(`Invalid relay URL: ${relay}`)
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Relay URL must use HTTP or HTTPS: ${relay}`)
  }

  return url.toString()
}
