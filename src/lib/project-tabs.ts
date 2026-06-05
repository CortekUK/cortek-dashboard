import type { LucideIcon } from "lucide-react"
import {
  Bell,
  ClipboardList,
  FileText,
  FolderOpen,
  LayoutDashboard,
  ListChecks,
  Rocket,
  Video,
  Wallet,
} from "lucide-react"

export type ProjectTabId =
  | "dashboard"
  | "phases"
  | "requirements"
  | "resources"
  | "onboarding"
  | "financials"
  | "meetings"
  | "documents"
  | "reminders"

export type ProjectTab = {
  id: ProjectTabId
  label: string
  icon: LucideIcon
}

export const PROJECT_TABS: ProjectTab[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "phases", label: "Tasks", icon: ListChecks },
  { id: "requirements", label: "Requirements", icon: ClipboardList },
  { id: "resources", label: "Resources", icon: FolderOpen },
  { id: "onboarding", label: "Onboarding", icon: Rocket },
  { id: "financials", label: "Financials", icon: Wallet },
  { id: "meetings", label: "Meetings", icon: Video },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "reminders", label: "Reminders", icon: Bell },
]

export const DEFAULT_PROJECT_TAB: ProjectTabId = "dashboard"

export function isProjectTabId(value: string | null | undefined): value is ProjectTabId {
  return !!value && PROJECT_TABS.some((t) => t.id === value)
}
