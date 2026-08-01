'use client'

import React, { useState } from 'react'
import {
  AlertTriangle,
  HelpCircle,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 relative">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-secondary/80 border border-border shrink-0">
            {iconMap[variant]}
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
          </div>
        </div>

        {requireReason && (
          <div className="space-y-2 pt-1">
            <Label className="text-xs font-semibold text-muted-foreground">Reason / Wajah (Optional)</Label>
            <Input
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              className="bg-slate-950 border-slate-800"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="border-slate-700 hover:bg-slate-800"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={handleConfirmClick}
            disabled={loading}
            className={`font-semibold ${btnBg[variant]}`}
          >
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
