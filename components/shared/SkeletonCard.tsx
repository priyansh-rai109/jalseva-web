'use client'

import React from 'react'

interface SkeletonCardProps {
  type?: 'supplier' | 'order' | 'product' | 'stat' | 'default'
  count?: number
}

export function SkeletonCard({ type = 'default', count = 1 }: SkeletonCardProps) {
  const items = Array.from({ length: count }, (_, i) => i)

  return (
    <>
      {items.map((key) => {
        if (type === 'stat') {
          return (
            <div key={key} className="glass-card p-6 space-y-3 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 bg-slate-800 rounded-md" />
                <div className="w-9 h-9 rounded-xl bg-slate-800" />
              </div>
              <div className="h-8 w-32 bg-slate-800 rounded-lg" />
              <div className="h-3 w-40 bg-slate-800/60 rounded" />
            </div>
          )
        }

        if (type === 'order') {
          return (
            <div key={key} className="glass-card p-5 space-y-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="h-4 w-28 bg-slate-800 rounded" />
                  <div className="h-3 w-20 bg-slate-800/60 rounded" />
                </div>
                <div className="h-6 w-20 bg-slate-800 rounded-full" />
              </div>
              <div className="h-12 bg-slate-800/40 rounded-lg" />
              <div className="flex justify-between items-center pt-2">
                <div className="h-5 w-24 bg-slate-800 rounded" />
                <div className="h-8 w-28 bg-slate-800 rounded-lg" />
              </div>
            </div>
          )
        }

        if (type === 'product') {
          return (
            <div key={key} className="glass-card p-5 space-y-4 animate-pulse">
              <div className="h-32 bg-slate-800 rounded-lg" />
              <div className="h-5 w-3/4 bg-slate-800 rounded" />
              <div className="h-4 w-1/2 bg-slate-800/60 rounded" />
              <div className="flex justify-between items-center pt-2">
                <div className="h-6 w-20 bg-slate-800 rounded" />
                <div className="h-9 w-24 bg-slate-800 rounded-lg" />
              </div>
            </div>
          )
        }

        if (type === 'supplier') {
          return (
            <div key={key} className="glass-card p-5 space-y-4 animate-pulse">
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 shrink-0" />
                  <div className="space-y-2">
                    <div className="h-5 w-36 bg-slate-800 rounded" />
                    <div className="h-3.5 w-48 bg-slate-800/60 rounded" />
                  </div>
                </div>
                <div className="h-5 w-12 bg-slate-800 rounded-full" />
              </div>
              <div className="flex gap-2 pt-1">
                <div className="h-6 w-16 bg-slate-800 rounded-full" />
                <div className="h-6 w-16 bg-slate-800 rounded-full" />
                <div className="h-6 w-16 bg-slate-800 rounded-full" />
              </div>
            </div>
          )
        }

        return (
          <div key={key} className="glass-card p-5 space-y-3 animate-pulse">
            <div className="h-5 w-1/2 bg-slate-800 rounded" />
            <div className="h-4 w-3/4 bg-slate-800/60 rounded" />
            <div className="h-10 bg-slate-800 rounded-lg" />
          </div>
        )
      })}
    </>
  )
}
