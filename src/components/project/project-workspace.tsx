"use client"

import { useSearchParams } from "next/navigation"

import { TabDashboard } from "@/components/project/tab-dashboard"
import { TabFinancials } from "@/components/project/tab-financials"
import { TabMeetings } from "@/components/project/tab-meetings"
import { TabOnboarding } from "@/components/project/tab-onboarding"
import { TabPhases } from "@/components/project/tab-phases"
import { TabReminders } from "@/components/project/tab-reminders"
import { TabRequirements } from "@/components/project/tab-requirements"
import { TabResources } from "@/components/project/tab-resources"
import { TabTimeline } from "@/components/project/tab-timeline"
import { TabToday } from "@/components/project/tab-today"
import { useProjects, type Project } from "@/lib/projects-context"
import {
  DEFAULT_PROJECT_TAB,
  isProjectTabId,
  type ProjectTabId,
} from "@/lib/project-tabs"
import type { Phase } from "@/lib/phases-db"

export function ProjectWorkspace({
  project,
  assignees,
  phases,
}: {
  project: Project
  assignees: string[]
  phases: Phase[]
}) {
  const { projects } = useProjects()
  const live = projects.find((p) => p.id === project.id) ?? project

  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const activeTab: ProjectTabId = isProjectTabId(tabParam)
    ? tabParam
    : DEFAULT_PROJECT_TAB

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {activeTab === "dashboard" && (
        <TabDashboard project={live} assignees={assignees} phases={phases} />
      )}
      {activeTab === "today" && <TabToday projectId={live.id} />}
      {activeTab === "phases" && <TabPhases projectId={live.id} />}
      {activeTab === "timeline" && <TabTimeline project={live} />}
      {activeTab === "requirements" && (
        <TabRequirements projectId={live.id} />
      )}
      {activeTab === "resources" && <TabResources projectId={live.id} />}
      {activeTab === "onboarding" && <TabOnboarding projectId={live.id} />}
      {activeTab === "financials" && <TabFinancials projectId={live.id} />}
      {activeTab === "meetings" && <TabMeetings projectId={live.id} />}
      {activeTab === "reminders" && <TabReminders projectId={live.id} />}
    </div>
  )
}
