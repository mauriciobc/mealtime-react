"use client"

import React from "react"
import { NotificationProvider } from "@/lib/context/NotificationContext"
import { SessionProvider } from "@/components/auth/session-provider"
import { Toaster } from "sonner"
import NotificationChecker from "@/components/notifications/notification-checker"
import { GlobalStateProvider } from "@/lib/context/global-state"
import { AnimationProvider } from "@/components/animation-provider"
import { OnboardingTour } from "@/components/ui/onboarding-tour"
import { ClientLayout } from "@/components/layout/client-layout"

export function RootClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <GlobalStateProvider>
      <SessionProvider>
        <NotificationProvider>
          <AnimationProvider>
            <ClientLayout>
              {children}
            </ClientLayout>
            <Toaster position="top-center" />
            <NotificationChecker />
            <OnboardingTour />
          </AnimationProvider>
        </NotificationProvider>
      </SessionProvider>
    </GlobalStateProvider>
  )
} 