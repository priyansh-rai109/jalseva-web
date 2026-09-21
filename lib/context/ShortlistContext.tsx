'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { ShortlistItem } from '@/types/bottle-printing'
import { toast } from 'sonner'

interface ShortlistContextType {
  shortlist: ShortlistItem[]
  count: number
  isShortlisted: (designCode: string) => boolean
  toggleShortlist: (item: ShortlistItem) => void
  removeFromShortlist: (designCode: string) => void
  clearShortlist: () => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  openDrawer: () => void
  closeDrawer: () => void
}

const STORAGE_KEY = 'jalseva_bottle_shortlist_v1'

const ShortlistContext = createContext<ShortlistContextType | undefined>(undefined)

export function ShortlistProvider({ children }: { children: React.ReactNode }) {
  const [shortlist, setShortlist] = useState<ShortlistItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  // Load from sessionStorage on mount (client-side only)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const stored = window.sessionStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed)) {
            setShortlist(parsed)
          }
        }
      }
    } catch (err) {
      console.warn('[ShortlistContext] Error reading sessionStorage:', err)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Sync to sessionStorage when shortlist changes
  useEffect(() => {
    if (!isLoaded) return
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(shortlist))
      }
    } catch (err) {
      console.warn('[ShortlistContext] Error saving to sessionStorage:', err)
    }
  }, [shortlist, isLoaded])

  const isShortlisted = (designCode: string) => {
    return shortlist.some(
      (item) => item.design_code.toUpperCase() === designCode.toUpperCase()
    )
  }

  const toggleShortlist = (item: ShortlistItem) => {
    const exists = isShortlisted(item.design_code)
    if (exists) {
      setShortlist((prev) =>
        prev.filter((i) => i.design_code.toUpperCase() !== item.design_code.toUpperCase())
      )
      toast.info(`Removed ${item.design_code} from shortlist`)
    } else {
      setShortlist((prev) => [...prev, item])
      toast.success(`Added ${item.design_code} to your shortlist! ✨`)
    }
  }

  const removeFromShortlist = (designCode: string) => {
    setShortlist((prev) =>
      prev.filter((i) => i.design_code.toUpperCase() !== designCode.toUpperCase())
    )
    toast.info(`Removed ${designCode} from shortlist`)
  }

  const clearShortlist = () => {
    setShortlist([])
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(STORAGE_KEY)
      }
    } catch (err) {
      console.warn('[ShortlistContext] Error clearing sessionStorage:', err)
    }
    toast.info('Shortlist cleared')
  }

  const openDrawer = () => setIsOpen(true)
  const closeDrawer = () => setIsOpen(false)

  return (
    <ShortlistContext.Provider
      value={{
        shortlist,
        count: shortlist.length,
        isShortlisted,
        toggleShortlist,
        removeFromShortlist,
        clearShortlist,
        isOpen,
        setIsOpen,
        openDrawer,
        closeDrawer,
      }}
    >
      {children}
    </ShortlistContext.Provider>
  )
}

export function useShortlist() {
  const context = useContext(ShortlistContext)
  if (!context) {
    throw new Error('useShortlist must be used within a ShortlistProvider')
  }
  return context
}
