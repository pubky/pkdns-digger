"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Search, Clipboard, Globe } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { KeyHistory } from "./key-history"
import { KeyAlert } from "./key-alert"
import { Header } from "./header"
import { Utils } from "@synonymdev/pkarr"

// Extract the raw public key by removing "pk:" or "pubky" prefix
function extractPublicKey(input: string): string {
  return input.replace(/^(pk:\s*|pubky)/i, '').trim()
}

export function PkSearch() {
  const [query, setQuery] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAlert, setShowAlert] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Show alert when error occurs
  useEffect(() => {
    if (error) {
      setShowAlert(true)
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setShowAlert(false)
      }, 5000)
      return () => clearTimeout(timer)
    } else {
      setShowAlert(false)
    }
  }, [error])

  // Validate public key format (pkarr uses z-base-32)
  const validatePublicKey = useCallback((key: string): boolean => {
    // z-base-32 characters for pkarr public keys
    const zbase32Regex = /^[13456789abcdefghijkmnopqrstuwxyz]+$/i

    const trimmedKey = key.trim()

    if (trimmedKey.length === 0) {
      setError("Please enter a public key")
      return false
    }

    // Exactly 52 characters - no more, no less
    if (trimmedKey.length !== 52) {
      setError("Public key must be exactly 52 characters long")
      return false
    }

    if (!zbase32Regex.test(trimmedKey)) {
      setError("Invalid public key format. Must be z-base-32 encoded")
      return false
    }

    if (!Utils.validatePublicKey(trimmedKey)){
      setError("Invalid Ed25519 publickey")
      return false
    }

    return true
  }, [setError])

  // Handle search functionality with error control
  const handleSearch = async () => {
    const trimmedQuery = extractPublicKey(query)

    setError(null)

    // Validate input
    if (!validatePublicKey(trimmedQuery)) {
      return
    }

    // Navigate to the key page using query parameter
    router.push(`/?id=${encodeURIComponent(trimmedQuery)}`)
  }

  // Handle input changes and clear errors
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    // Clear error when user starts typing
    if (error) {
      setError(null)
    }
  }

  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
      }

      // Close on escape and clear errors
      if (e.key === "Escape") {
        inputRef.current?.blur()
        setError(null)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSearch()
    }
  }

  // Handle paste functionality
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setQuery(text)
    } catch {
      setError("Failed to paste from clipboard")
    }
  }

  // Get border color based on state
  const getBorderColor = () => {
    if (error) return "rgb(221 107 107)" // red-500
    if (isFocused) return "rgb(91, 64, 234)" // purple-500
    return ""
  }

  // Get box shadow based on state
  const getBoxShadow = () => {
    if (error) return "0 0 0 1px rgb(221 107 107)"
    if (isFocused) return "0 0 0 1px rgb(91, 64, 234)"
    return ""
  }

  // Handle alert dismiss
  const dismissAlert = useCallback(() => {
    setShowAlert(false)
    setError(null)
    // Reset input styles by re-validating current input
    if (query.trim().length > 0) {
      validatePublicKey(query)
    }
  }, [query, validatePublicKey])

  // Auto-dismiss effect
  useEffect(() => {
    if (error) {
      setShowAlert(true)
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        dismissAlert() // Use the same dismissAlert function for consistency
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, dismissAlert])

  // Check if current input is valid without setting error
  const isValidKey = (key: string): boolean => {
    const zbase32Regex = /^[13456789abcdefghijkmnopqrstuwxyz]+$/i
    const trimmedKey = extractPublicKey(key)
    return trimmedKey.length === 52 && zbase32Regex.test(trimmedKey) && Utils.validatePublicKey(trimmedKey)
  }

  return (
    <>
      <KeyAlert showAlert={showAlert} error={error} dismissAlert={dismissAlert} />
      <main className="grid grid-rows-12 px-4 h-[calc(100vh-8rem)] w-full max-w-4xl mx-auto gap-8">
        <div className="row-span-9 flex items-center">
          <div className="bg-[#1d1d20] rounded-lg p-20 backdrop-blur-sm w-full text-center">
            <Header />
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>

              <Input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Enter or paste a pubky"
                className={`pl-10 pr-24 py-6 rounded-full border-[#27272a] focus-visible:ring-0 focus-visible:ring-offset-0 font-semibold ${
                  !isFocused ? 'border-dashed' : ''
                } ${
                  error ? 'border-red-500' : ''
                }`}
                style={{
                  borderColor: getBorderColor(),
                  boxShadow: getBoxShadow(),
                  color: error ? "rgb(221 107 107)" : isValidKey(query) ? "#ffffff" : "#9f9fa9",
                  backgroundColor: "#161617",
                }}
              />

              <div className="absolute inset-y-0 right-3 flex items-center">
                {query.length > 0 ? (
                  <button
                    onClick={handleSearch}
                    className={`px-4 py-2 text-sm font-medium rounded-full transition-colors flex items-center gap-2 ${
                      isValidKey(query)
                        ? 'text-white bg-[#5b40ea] hover:bg-[#4f37cc]'
                        : 'text-muted-foreground bg-[#27272a] hover:bg-[#313136] hover:text-white'
                    }`}
                  >
                    <Globe className="h-4 w-4" />
                    Resolve
                  </button>
                ) : (
                  <button
                    onClick={handlePaste}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground bg-[#27272a] hover:bg-[#313136] hover:text-white rounded-full transition-colors flex items-center gap-2"
                  >
                    <Clipboard className="h-4 w-4" />
                    Paste
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <KeyHistory />
      </main>
    </>
  )
}