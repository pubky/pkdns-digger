"use client"

import { useState } from "react"
import { Cog, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DEFAULT_PKARR_SETTINGS,
  formatRelayInput,
  parseRelayInput,
} from "@/lib/pkarr-settings"
import { RESOLVE_POLICY_LABELS, type ResolvePolicyName } from "@/lib/resolve-policy"
import { usePkarr } from "@/providers/pkarr-provider"
import { cn } from "@/lib/utils"

const POLICY_OPTIONS: Array<{
  value: ResolvePolicyName
  label: string
  description: string
}> = [
  {
    value: "cache-first",
    label: RESOLVE_POLICY_LABELS["cache-first"],
    description: "Use fresh cached data. If unavailable, query the network.",
  },
  {
    value: "network-only",
    label: RESOLVE_POLICY_LABELS["network-only"],
    description: "Bypass cached data and request the most recent packet from the DHT.",
  },
  {
    value: "cache-only",
    label: RESOLVE_POLICY_LABELS["cache-only"],
    description: "Use cached packets only. Data may be outdated.",
  },
]

export function PkarrSettingsDialog() {
  const { settings, environmentRelays, applySettings, resetSettings } = usePkarr()
  const [open, setOpen] = useState(false)
  const [resolvePolicy, setResolvePolicy] = useState(settings.resolvePolicy)
  const [relayInput, setRelayInput] = useState(formatRelayInput(settings.relays))
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setResolvePolicy(settings.resolvePolicy)
      setRelayInput(formatRelayInput(settings.relays))
      setValidationError(null)
    }
  }

  const handleApply = (event: React.FormEvent) => {
    event.preventDefault()

    try {
      const relays = parseRelayInput(relayInput)
      applySettings({ resolvePolicy, relays })
      setOpen(false)
    } catch (cause) {
      setValidationError(cause instanceof Error ? cause.message : "Invalid relay URL")
    }
  }

  const handleReset = () => {
    resetSettings()
    setResolvePolicy(DEFAULT_PKARR_SETTINGS.resolvePolicy)
    setRelayInput("")
    setValidationError(null)
    setOpen(false)
  }

  const fallbackDescription = environmentRelays.length
    ? `Application default: ${environmentRelays.join(", ")}`
    : "Empty uses the default relays provided by pkarr."

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-[#7c63ff]">
          <Cog className="size-5" />
          <span className="sr-only">Pkarr settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolution settings</DialogTitle>
          <DialogDescription>
            Choose how records are resolved and which relays this browser uses.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-6" onSubmit={handleApply}>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-white">Resolve policy</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {POLICY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "cursor-pointer rounded-lg border p-3 transition-colors",
                    resolvePolicy === option.value
                      ? "border-[#5b40ea] bg-[#5b40ea]/15"
                      : "border-white/10 bg-white/[0.025] hover:border-white/20"
                  )}
                >
                  <input
                    type="radio"
                    name="resolve-policy"
                    value={option.value}
                    checked={resolvePolicy === option.value}
                    onChange={() => setResolvePolicy(option.value)}
                    className="sr-only"
                  />
                  <span className="block text-sm font-medium text-white">{option.label}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    {option.description}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <label htmlFor="pkarr-relays" className="text-sm font-medium text-white">
              Relay URLs
            </label>
            <textarea
              id="pkarr-relays"
              value={relayInput}
              onChange={(event) => {
                setRelayInput(event.target.value)
                setValidationError(null)
              }}
              rows={4}
              placeholder="https://pkarr.pubky.app/"
              aria-invalid={Boolean(validationError)}
              aria-describedby="pkarr-relay-help pkarr-relay-error"
              className="flex w-full resize-y rounded-md border border-input bg-[#0f0f10] px-3 py-2 font-mono text-sm outline-none placeholder:text-muted-foreground focus-visible:border-[#5b40ea] focus-visible:ring-2 focus-visible:ring-[#5b40ea]/40 aria-invalid:border-red-400"
            />
            <p id="pkarr-relay-help" className="text-xs leading-relaxed text-muted-foreground">
              One HTTP or HTTPS URL per line, or comma-separated. {fallbackDescription}
            </p>
            {validationError && (
              <p id="pkarr-relay-error" className="text-xs text-red-400">
                {validationError}
              </p>
            )}
            {relayInput.includes("http://") && (
              <p className="text-xs text-amber-400/90">
                Browsers may block HTTP relays when this site is served over HTTPS.
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="ghost" onClick={handleReset} className="text-muted-foreground">
              <RotateCcw className="size-4" />
              Reset defaults
            </Button>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" className="bg-[#5b40ea] text-white hover:bg-[#4f37cc]">
                Apply settings
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
