import { notFound } from "next/navigation"

import { PhaseEditor } from "@/components/project/phase-editor"
import { getProject } from "@/lib/projects-db"

export default async function NewPhasePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = await getProject(id)
  if (!project) notFound()
  return <PhaseEditor project={project} phase={null} goals={[]} tasks={[]} />
}
