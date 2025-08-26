import { useState, useCallback, useRef } from 'react'
import { validateURL, type URLValidationResult } from '@/lib/utils'

export interface URLValidationState {
  [key: string]: URLValidationResult
}

export function useURLValidation() {
  const [validationStates, setValidationStates] = useState<URLValidationState>({})
  const timeoutsRef = useRef<{ [key: string]: NodeJS.Timeout }>({})
  const cacheRef = useRef<{ [key: string]: URLValidationResult }>({})

  const validateURLWithDebounce = useCallback((key: string, url: string) => {
    // Clear existing timeout for this key
    if (timeoutsRef.current[key]) {
      clearTimeout(timeoutsRef.current[key])
    }

    // Check cache first
    const cacheKey = `${key}:${url}`
    if (cacheRef.current[cacheKey]) {
      setValidationStates(prev => ({
        ...prev,
        [key]: cacheRef.current[cacheKey]
      }))
      return
    }

    // Set validating state immediately for empty -> non-empty transitions
    if (url.trim() !== '') {
      setValidationStates(prev => ({
        ...prev,
        [key]: { status: 'validating' }
      }))
    }

    // Debounce validation
    timeoutsRef.current[key] = setTimeout(() => {
      const result = validateURL(url)
      
      // Cache the result
      cacheRef.current[cacheKey] = result
      
      setValidationStates(prev => ({
        ...prev,
        [key]: result
      }))
    }, 500)
  }, [])

  const getValidationStatus = useCallback((key: string): URLValidationResult => {
    return validationStates[key] || { status: 'empty' }
  }, [validationStates])

  const getValidationStats = useCallback(() => {
    const states = Object.values(validationStates)
    const valid = states.filter(s => s.status === 'valid').length
    const invalid = states.filter(s => s.status === 'invalid').length
    const validating = states.filter(s => s.status === 'validating').length
    const total = states.filter(s => s.status !== 'empty').length
    
    return { valid, invalid, validating, total }
  }, [validationStates])

  return {
    validateURL: validateURLWithDebounce,
    getValidationStatus,
    getValidationStats
  }
}