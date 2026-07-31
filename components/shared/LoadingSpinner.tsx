import React from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  text?: string
  subtext?: string
  fullScreen?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingSpinner({
  text = 'Loading...',
  subtext,
  fullScreen = false,
  className = '',
  size = 'md',
}: LoadingSpinnerProps) {
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  const content = (
    <div className={`flex flex-col items-center justify-center space-y-3 text-center p-6 ${className}`}>
      <div className="relative flex items-center justify-center">
        <div className="absolute w-12 h-12 rounded-full bg-sky-500/10 animate-ping opacity-75" />
        <Loader2 className={`${iconSizes[size]} animate-spin text-sky-400 relative z-10`} />
      </div>
      {text && (
        <p className="text-sm font-semibold text-foreground tracking-wide">
          {text}
        </p>
      )}
      {subtext && (
        <p className="text-xs text-muted-foreground max-w-xs">
          {subtext}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        {content}
      </div>
    )
  }

  return content
}
