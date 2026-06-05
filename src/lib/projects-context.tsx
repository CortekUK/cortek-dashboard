"use client"

import * as React from "react"

import {
  bulkInsertProjects,
  deleteProject as dbDeleteProject,
  insertProject as dbInsertProject,
  listProjects as dbListProjects,
  updateProjectClientName as dbUpdateProjectClientName,
  updateProjectDates as dbUpdateProjectDates,
  updateProjectDemoCredentials as dbUpdateProjectDemoCredentials,
  updateProjectDeveloperName as dbUpdateProjectDeveloperName,
  updateProjectLiveUrl as dbUpdateProjectLiveUrl,
  updateProjectName as dbUpdateProjectName,
  updateProjectStage as dbUpdateProjectStage,
  type Project,
  type ProjectStage,
} from "@/lib/projects-db"

export type { Project, ProjectStage }

type ProjectsContextValue = {
  projects: Project[]
  isLoading: boolean
  error: string | null
  addProject: (input: {
    clientName: string
    projectName: string
    stage?: ProjectStage
  }) => Promise<void>
  removeProject: (id: string) => Promise<void>
  setName: (id: string, projectName: string) => Promise<void>
  setClientName: (id: string, clientName: string) => Promise<void>
  setDeveloperName: (id: string, developerName: string | null) => Promise<void>
  setStage: (id: string, stage: ProjectStage) => Promise<void>
  setDates: (
    id: string,
    dates: { startDate: string | null; endDate: string | null }
  ) => Promise<void>
  setLiveUrl: (id: string, liveUrl: string | null) => Promise<void>
  setDemoCredentials: (
    id: string,
    creds: { demoUsername: string | null; demoPassword: string | null }
  ) => Promise<void>
  refresh: () => Promise<void>
  legacyLocalProjectCount: number
  importLegacyLocalProjects: () => Promise<void>
}

const ProjectsContext = React.createContext<ProjectsContextValue | null>(null)
const LEGACY_STORAGE_KEY = "cortek.projects"

type LegacyProject = {
  id?: string
  clientName?: string
  projectName?: string
  createdAt?: string
}

function readLegacyLocalProjects(): LegacyProject[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (p): p is LegacyProject =>
        !!p && typeof (p as LegacyProject).projectName === "string"
    )
  } catch {
    return []
  }
}

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = React.useState<Project[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [legacyLocalProjectCount, setLegacyLocalProjectCount] =
    React.useState(0)

  const refresh = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const rows = await dbListProjects()
      setProjects(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void refresh()
    setLegacyLocalProjectCount(readLegacyLocalProjects().length)
  }, [refresh])

  const addProject = React.useCallback<ProjectsContextValue["addProject"]>(
    async ({ clientName, projectName, stage }) => {
      const created = await dbInsertProject({
        clientName: clientName.trim(),
        projectName: projectName.trim(),
        stage,
      })
      setProjects((prev) => [created, ...prev])
    },
    []
  )

  const removeProject = React.useCallback<ProjectsContextValue["removeProject"]>(
    async (id) => {
      await dbDeleteProject(id)
      setProjects((prev) => prev.filter((p) => p.id !== id))
    },
    []
  )

  const setName = React.useCallback<ProjectsContextValue["setName"]>(
    async (id, projectName) => {
      const updated = await dbUpdateProjectName(id, projectName)
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)))
    },
    []
  )

  const setClientName = React.useCallback<ProjectsContextValue["setClientName"]>(
    async (id, clientName) => {
      const updated = await dbUpdateProjectClientName(id, clientName)
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)))
    },
    []
  )

  const setDeveloperName = React.useCallback<
    ProjectsContextValue["setDeveloperName"]
  >(async (id, developerName) => {
    const updated = await dbUpdateProjectDeveloperName(id, developerName)
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)))
  }, [])

  const setStage = React.useCallback<ProjectsContextValue["setStage"]>(
    async (id, stage) => {
      const updated = await dbUpdateProjectStage(id, stage)
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)))
    },
    []
  )

  const setDates = React.useCallback<ProjectsContextValue["setDates"]>(
    async (id, dates) => {
      const updated = await dbUpdateProjectDates(id, dates)
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)))
    },
    []
  )

  const setLiveUrl = React.useCallback<ProjectsContextValue["setLiveUrl"]>(
    async (id, liveUrl) => {
      const updated = await dbUpdateProjectLiveUrl(id, liveUrl)
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)))
    },
    []
  )

  const setDemoCredentials = React.useCallback<
    ProjectsContextValue["setDemoCredentials"]
  >(async (id, creds) => {
    const updated = await dbUpdateProjectDemoCredentials(id, creds)
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)))
  }, [])

  const importLegacyLocalProjects = React.useCallback(async () => {
    const legacy = readLegacyLocalProjects()
    if (legacy.length === 0) return
    const inserted = await bulkInsertProjects(
      legacy
        .filter(
          (p) =>
            typeof p.clientName === "string" &&
            typeof p.projectName === "string"
        )
        .map((p) => ({
          clientName: (p.clientName ?? "").trim() || "Unknown client",
          projectName: (p.projectName ?? "").trim(),
        }))
    )
    setProjects((prev) => [...inserted, ...prev])
    try {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY)
    } catch {}
    setLegacyLocalProjectCount(0)
  }, [])

  const value = React.useMemo<ProjectsContextValue>(
    () => ({
      projects,
      isLoading,
      error,
      addProject,
      removeProject,
      setName,
      setClientName,
      setDeveloperName,
      setStage,
      setDates,
      setLiveUrl,
      setDemoCredentials,
      refresh,
      legacyLocalProjectCount,
      importLegacyLocalProjects,
    }),
    [
      projects,
      isLoading,
      error,
      addProject,
      removeProject,
      setName,
      setClientName,
      setDeveloperName,
      setStage,
      setDates,
      setLiveUrl,
      setDemoCredentials,
      refresh,
      legacyLocalProjectCount,
      importLegacyLocalProjects,
    ]
  )

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  )
}

export function useProjects() {
  const ctx = React.useContext(ProjectsContext)
  if (!ctx) {
    throw new Error("useProjects must be used within a ProjectsProvider.")
  }
  return ctx
}
