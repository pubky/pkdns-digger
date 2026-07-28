"use client"

import { Client, ResolvePolicy, type SignedPacket } from "@synonymdev/pkarr"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  clearPkarrSettings,
  DEFAULT_PKARR_SETTINGS,
  environmentRelays,
  loadPkarrSettings,
  savePkarrSettings,
  type PkarrSettings,
} from "@/lib/pkarr-settings"
import type { ResolvePolicyName } from "@/lib/resolve-policy"

interface PkarrContextType {
  settings: PkarrSettings
  environmentRelays: string[]
  isLoading: boolean
  error: string | null
  resolve: (publicKey: string) => Promise<SignedPacket | null>
  applySettings: (settings: PkarrSettings) => void
  resetSettings: () => void
  retry: () => void
}

interface ManagedClient {
  client: Client
  pendingRequests: number
  retired: boolean
  freed: boolean
}

const INITIALIZATION_ERROR = "Pkarr client failed to initialize. Please check your relay settings."
const PkarrContext = createContext<PkarrContextType | undefined>(undefined)

export function PkarrProvider({ children }: { children: ReactNode }) {
  const configuredEnvironmentRelays = useMemo(environmentRelays, [])
  const [settings, setSettings] = useState<PkarrSettings>(DEFAULT_PKARR_SETTINGS)
  const [managedClient, setManagedClient] = useState<ManagedClient | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const clientRef = useRef<ManagedClient | null>(null)

  const effectiveRelays = settings.relays.length
    ? settings.relays
    : configuredEnvironmentRelays
  const relayKey = effectiveRelays.join("\n")

  useEffect(() => {
    setSettings(loadPkarrSettings())
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    setIsLoading(true)
    setError(null)

    try {
      const client = effectiveRelays.length ? new Client(effectiveRelays) : new Client()
      const nextClient: ManagedClient = {
        client,
        pendingRequests: 0,
        retired: false,
        freed: false,
      }
      const previousClient = clientRef.current

      clientRef.current = nextClient
      setManagedClient(nextClient)
      retireClient(previousClient)
      setIsLoading(false)
    } catch (cause) {
      console.error("Failed to create pkarr client:", cause)
      setManagedClient(null)
      clientRef.current = null
      setError(cause instanceof Error ? cause.message : INITIALIZATION_ERROR)
      setIsLoading(false)
    }

    return () => {
      const client = clientRef.current
      if (client) {
        retireClient(client)
        if (clientRef.current === client) clientRef.current = null
      }
    }
    // relayKey intentionally represents the normalized relay configuration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, relayKey, retryCount])

  const resolve = useCallback(async (publicKey: string): Promise<SignedPacket | null> => {
    if (!managedClient) throw new Error(INITIALIZATION_ERROR)

    managedClient.pendingRequests += 1
    try {
      return await managedClient.client.resolve(publicKey, toResolvePolicy(settings.resolvePolicy))
    } finally {
      managedClient.pendingRequests -= 1
      freeRetiredClient(managedClient)
    }
  }, [managedClient, settings.resolvePolicy])

  const applySettings = useCallback((nextSettings: PkarrSettings) => {
    const settingsCopy = { ...nextSettings, relays: [...nextSettings.relays] }
    savePkarrSettings(settingsCopy)
    setSettings(settingsCopy)
  }, [])

  const resetSettings = useCallback(() => {
    clearPkarrSettings()
    setSettings({ ...DEFAULT_PKARR_SETTINGS })
  }, [])

  const retry = useCallback(() => setRetryCount((count) => count + 1), [])

  const value: PkarrContextType = {
    settings,
    environmentRelays: configuredEnvironmentRelays,
    isLoading,
    error,
    resolve,
    applySettings,
    resetSettings,
    retry,
  }

  return <PkarrContext.Provider value={value}>{children}</PkarrContext.Provider>
}

export function usePkarr(): PkarrContextType {
  const context = useContext(PkarrContext)
  if (!context) throw new Error("usePkarr must be used within a PkarrProvider")
  return context
}

function retireClient(managedClient: ManagedClient | null): void {
  if (!managedClient) return
  managedClient.retired = true
  freeRetiredClient(managedClient)
}

function freeRetiredClient(managedClient: ManagedClient): void {
  if (managedClient.retired && managedClient.pendingRequests === 0 && !managedClient.freed) {
    managedClient.freed = true
    managedClient.client.free()
  }
}

function toResolvePolicy(policy: ResolvePolicyName): ResolvePolicy {
  switch (policy) {
    case "cache-only":
      return ResolvePolicy.CacheOnly
    case "network-only":
      return ResolvePolicy.NetworkOnly
    case "cache-first":
      return ResolvePolicy.CacheFirst
  }
}
