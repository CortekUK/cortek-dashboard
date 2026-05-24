import { notFound } from "next/navigation"

import { ProjectWorkspace } from "@/components/project/project-workspace"
import { listPhases } from "@/lib/phases-db"
import { getProject } from "@/lib/projects-db"
import { listDistinctAssignees } from "@/lib/tasks-db"

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [project, assignees, phases] = await Promise.all([
    getProject(id),
    listDistinctAssignees(id),
    listPhases(id),
  ])
  if (!project) notFound()
  return (
    <ProjectWorkspace
      project={project}
      assignees={assignees}
      phases={phases}
    />
  )
}
