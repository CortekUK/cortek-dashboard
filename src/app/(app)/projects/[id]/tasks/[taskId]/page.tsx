import { notFound } from "next/navigation"

import { TaskDetail } from "@/components/project/task-detail"
import { listPhases } from "@/lib/phases-db"
import { getProject } from "@/lib/projects-db"
import { getTask } from "@/lib/tasks-db"

export default async function TaskPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>
}) {
  const { id, taskId } = await params
  const [project, task, phases] = await Promise.all([
    getProject(id),
    getTask(taskId),
    listPhases(id),
  ])
  if (!project || !task || task.projectId !== project.id) notFound()
  return <TaskDetail project={project} task={task} phases={phases} />
}
