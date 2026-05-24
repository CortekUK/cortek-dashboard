import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ProjectsProvider } from "@/lib/projects-context";
import { getProfile } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <ProjectsProvider>
      <SidebarProvider>
        <AppSidebar profile={profile} />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </ProjectsProvider>
  );
}
