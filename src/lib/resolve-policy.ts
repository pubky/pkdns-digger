export const RESOLVE_POLICY_NAMES = [
  "cache-first",
  "network-only",
  "cache-only",
] as const

export type ResolvePolicyName = (typeof RESOLVE_POLICY_NAMES)[number]

export const RESOLVE_POLICY_LABELS: Record<ResolvePolicyName, string> = {
  "cache-first": "Cache First",
  "network-only": "Network Only",
  "cache-only": "Cache Only",
}
