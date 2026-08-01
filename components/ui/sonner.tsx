"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast backdrop-blur-xl border font-medium shadow-2xl transition-all duration-300 transform-gpu animate-in slide-in-from-top-4 fade-in duration-300 rounded-xl p-4",
          description: "text-muted-foreground text-xs",
          actionButton: "bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all text-xs px-3 py-1.5 rounded-lg",
          cancelButton: "bg-muted text-muted-foreground hover:bg-secondary transition-all text-xs px-3 py-1.5 rounded-lg",
          success: "!border-emerald-500/40 !bg-slate-900/95 !text-emerald-300 !shadow-emerald-500/15",
          error: "!border-red-500/40 !bg-slate-900/95 !text-red-300 !shadow-red-500/15",
          info: "!border-sky-500/40 !bg-slate-900/95 !text-sky-300 !shadow-sky-500/15",
        },
        duration: 3500,
      }}
      {...props}
    />
  )
}

export { Toaster }
