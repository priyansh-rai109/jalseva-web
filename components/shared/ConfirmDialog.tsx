'use client'

import React, { useState } from 'react'
import {
  AlertTriangle,
  HelpCircle,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'destructive' | 'warning' | 'primary'
  requireReason?: boolean
  reasonPlaceholder?: string
  loading?: boolean
  onConfirm: (reason?: string) => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Haan, Proceed karo',
  cancelText = 'Nahi, Wapas chalo',
  variant = 'destructive',
  requireReason = false,
  reasonPlaceholder = 'Reason batayein (optional)...',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('')

  if (!isOpen) return null

  const handleConfirmClick = () => {
    onConfirm(requireReason ? reason : undefined)
    setReason('')
  }

  const iconMap = {
    destructive: <AlertTriangle className="w-6 h-6 text-red-400" />,
    warning: <AlertTriangle className="w-6 h-6 text-amber-400" />,
    primary: <HelpCircle className="w-6 h-6 text-sky-400" />,
  }

  const btnBg = {
    destructive: 'bg-red-600 hover:bg-red-500 text-white',
    warning: 'bg-amber-600 hover:bg-amber-500 text-white',
    primary: 'bg-sky-600 hover:bg-sky-500 text-white',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl space-y-5 relative text-white">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-slate-800/90 border border-slate-700/80 shrink-0">
            {iconMap[variant]}
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="text-sm text-slate-300 leading-relaxed">{message}</p>
          </div>
        </div>

        {requireReason && (
          <div className="space-y-2 pt-1">
            <Label className="text-xs font-semibold text-slate-200" style={{ color: '#e2e8f0' }}>
              Reason / Wajah (Optional)
            </Label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              autoComplete="off"
              style={{
                color: '#ffffff',
                WebkitTextFillColor: '#ffffff',
                caretColor: '#38bdf8',
                backgroundColor: '#020617',
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-white placeholder:text-slate-400 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 transition-all shadow-inner"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700 hover:text-white font-medium"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={handleConfirmClick}
            disabled={loading}
            className={`font-semibold text-white ${btnBg[variant]}`}
          >
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
