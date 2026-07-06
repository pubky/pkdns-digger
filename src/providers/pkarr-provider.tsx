"use client"

/**
 * PkarrProvider: React Context provider that manages a singleton Pkarr Client instance.
 * Handles client initialization, loading states, error handling, and retry logic.
 */

import { Client } from '@synonymdev/pkarr'
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'


interface PkarrContextType {
  client: Client | null
  isLoading: boolean
  error: string | null
  retry: () => void
}

interface PkarrProviderProps {
  children: ReactNode
}

// Constants
const ERRORS = {
  INITIALIZATION_FAILED: 'Pkarr client failed to initialize. Please refresh the page.',
  GENERIC: 'Failed to initialize pkarr client'
} as const

// Singleton state outside React
interface SingletonState {
  client: Client | null
  initializationFailed: boolean
  initializationPromise: Promise<Client> | null
}

const singletonState: SingletonState = {
  client: null,
  initializationFailed: false,
  initializationPromise: null
}

// Context
const PkarrContext = createContext<PkarrContextType | undefined>(undefined)

// Helper functions
const isServerSide = () => typeof window === 'undefined'

const configuredRelays = (): string[] | null => {
  const relays = process.env.NEXT_PUBLIC_PKARR_RELAYS
    ?.split(',')
    .map((relay) => relay.trim())
    .filter(Boolean)

  return relays?.length ? relays : null
}

const resetSingletonState = (): void => {
  singletonState.client = null
  singletonState.initializationFailed = false
  // Avoids race condition
  singletonState.initializationPromise = null
}

const initializePkarrClient = async (): Promise<Client> => {
  // Return existing client
  if (singletonState.client) {
    return singletonState.client
  }

  // Don't retry if initialization already failed
  if (singletonState.initializationFailed) {
    throw new Error(ERRORS.INITIALIZATION_FAILED)
  }

  // Don't load on server side
  if (isServerSide()) {
    throw new Error('Server-side initialization not supported')
  }

  // Return existing promise if initialization is in progress
  if (singletonState.initializationPromise) {
    return await singletonState.initializationPromise
  }

  // Start new initialization
  singletonState.initializationPromise = Promise.resolve().then(() => {
    try {
      const relays = configuredRelays()
      const client = relays ? new Client(relays) : new Client()
      singletonState.client = client
      return client
    } catch (error) {
      singletonState.initializationFailed = true
      console.error('Failed to create pkarr client:', error)
      throw error
    } finally {
      singletonState.initializationPromise = null
    }
  })

  return await singletonState.initializationPromise
}

// Provider Component
export function PkarrProvider({ children }: PkarrProviderProps) {
  const [client, setClient] = useState<Client | null>(singletonState.client)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleInitialization = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Load client
      const clientInstance = await initializePkarrClient()
      
      setClient(clientInstance)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERRORS.GENERIC
      setError(errorMessage)
      console.error('Pkarr client initialization failed:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const retry = useCallback(() => {
    resetSingletonState()
    handleInitialization()
  }, [handleInitialization])

  useEffect(() => {
    handleInitialization()
  }, [handleInitialization])

  const contextValue: PkarrContextType = {
    client,
    isLoading,
    error,
    retry
  }

  return (
    <PkarrContext.Provider value={contextValue}>
      {children}
    </PkarrContext.Provider>
  )
}

// Hook
export function usePkarr(): PkarrContextType {
  const context = useContext(PkarrContext)
  if (context === undefined) {
    throw new Error('usePkarr must be used within a PkarrProvider')
  }
  return context
}

// Export for non-React usage
export async function getPkarrClient(): Promise<Client> {
  return await initializePkarrClient()
} 
