import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type URLValidationStatus = 'valid' | 'invalid' | 'empty' | 'validating'

export interface URLValidationResult {
  status: URLValidationStatus
  message?: string
}

export function validateURL(url: string): URLValidationResult {
  if (!url || url.trim() === '') {
    return { status: 'empty' }
  }

  const trimmedUrl = url.trim()
  
  // Basic protocol check
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    return { 
      status: 'invalid', 
      message: 'URL deve começar com http:// ou https://' 
    }
  }

  // URL validation regex
  const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
  
  if (!urlRegex.test(trimmedUrl)) {
    return { 
      status: 'invalid', 
      message: 'Formato de URL inválido' 
    }
  }

  return { status: 'valid' }
}
