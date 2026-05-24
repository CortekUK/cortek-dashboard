import { notFound } from "next/navigation"

import { PhaseEditor } from "@/components/project/phase-editor"
import { listPhaseGoals } from "@/lib/phase-goals-db"
import { getPhase } from "@/lib/phases-db"
import { getProject } from "@/lib/projects-db"
import { listTasks } from "@/lib/tasks-db"

export default async function PhasePage({
  params,
}: {
  params: Promise<{ id: string; phaseId: string }>
}) {
  const { id, phaseId } = await params
  const [project, phase, goals, allTasks] = await Promise.all([
    getProject(id),
    getPhase(phaseId),
    listPhaseGoals(phaseId),
    listTasks(id),
  ])
  if (!project || !phase || phase.projectId !== project.id) notFound()
  const tasks = allTasks.filter((t) => t.phaseId === phaseId)
  return (
    <PhaseEditor project={project} phase={phase} goals={goals} tasks={tasks} />
  )
}
