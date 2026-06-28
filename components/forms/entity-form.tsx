"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface EntityFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode
}

export function EntityForm({ children, className, ...props }: EntityFormProps) {
  return (
    <form className={cn("space-y-6", className)} {...props}>
      {children}
    </form>
  )
}

interface EntityFormFieldProps {
  label: string
  children: React.ReactNode
  error?: string
  required?: boolean
  className?: string
}

export function EntityFormField({ label, children, error, required, className }: EntityFormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
