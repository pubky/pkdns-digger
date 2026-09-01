'use client'

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

const RECENT_KEYS_MAX_LENGTH = 10

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Local storage related operations
export function getRecentKeys() {
  if (typeof window === 'undefined') return {}
  const keys = localStorage.getItem('pkarr-keys')
  return keys ? JSON.parse(keys) : {}
}

export function saveRecentKey(key: string) {
  const keys = getRecentKeys()
  // Get existing tag if any, otherwise empty string
  const tag = keys[key] || ""
  
  // Create new object without the key
  // Keep only the 9 most recent keys (excluding current key)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [key]: _, ...rest } = keys;
  const remainingKeys = Object.fromEntries(
    Object.entries(rest).slice(0, RECENT_KEYS_MAX_LENGTH - 1)
  )
  
  // Add key back at the front
  const updatedKeys = {
    [key]: tag,
    ...remainingKeys
  }
  localStorage.setItem('pkarr-keys', JSON.stringify(updatedKeys))
}

export function setKeyTag(key: string, tag: string) {
  if (typeof window === 'undefined') return
  const keysWithTags = localStorage.getItem('pkarr-keys') 
  const tagsMap = keysWithTags ? JSON.parse(keysWithTags) : {}
  tagsMap[key] = tag
  localStorage.setItem('pkarr-keys', JSON.stringify(tagsMap))
}

export function getKeyTag(key: string) {
  if (typeof window === 'undefined') return null
  const keysWithTags = localStorage.getItem('pkarr-keys') 
  const tagsMap = keysWithTags ? JSON.parse(keysWithTags) : {}
  return tagsMap[key]
}

export function deleteKey(key: string) {
  if (typeof window === 'undefined') return
  const keysWithTags = localStorage.getItem('pkarr-keys') 
  const tagsMap = keysWithTags ? JSON.parse(keysWithTags) : {}
  delete tagsMap[key]
  localStorage.setItem('pkarr-keys', JSON.stringify(tagsMap))
}

export function extractPublicKey(input: string): string {
  return input.replace(/^(pk:\s*|pubky)/i, '').trim()
}
