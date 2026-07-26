'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'

export function SessionToastHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (searchParams.get('session_changed') === 'true') {
      const newRole = searchParams.get('role') || 'another'
      toast.info(`Your session changed because you logged in as a ${newRole} in another tab.`, {
        duration: 8000,
      })
      
      // Clean up the URL
      const newSearchParams = new URLSearchParams(searchParams.toString())
      newSearchParams.delete('session_changed')
      newSearchParams.delete('role')
      
      const newUrl = `${pathname}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''}`
      router.replace(newUrl, { scroll: false })
    }
  }, [searchParams, pathname, router])

  return null
}
