"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { ArrowLeft, FolderKanban, Home, Users } from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { SidebarUserMenu } from "@/components/sidebar-user-menu"
import type { Profile } from "@/lib/auth"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  DEFAULT_PROJECT_TAB,
  isProjectTabId,
  PROJECT_TABS,
} from "@/lib/project-tabs"
import { useProjects } from "@/lib/projects-context"

const PROJECT_PATH_RE = /^\/projects\/([^/]+)(?:\/|$)/

function projectIdFromPath(pathname: string): string | null {
  const m = pathname.match(PROJECT_PATH_RE)
  // /projects (list) shouldn't match
  if (!m || m[1] === "") return null
  return m[1]
}

export function AppSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { projects } = useProjects()

  const activeProjectId = projectIdFromPath(pathname)
  const activeProject = activeProjectId
    ? projects.find((p) => p.id === activeProjectId)
    : null

  const tabParam = searchParams.get("tab")
  const activeTab = isProjectTabId(tabParam) ? tabParam : DEFAULT_PROJECT_TAB

  const inProjectView = activeProjectId !== null

  return (
    <Sidebar>
      <SidebarHeader className="gap-1">
        <SidebarMenu>
          {inProjectView ? (
            <SidebarMenuItem>
              <SidebarMenuButton
                render={
                  <Link href="/projects">
                    <ArrowLeft />
                    <span>Back to projects</span>
                  </Link>
                }
              />
            </SidebarMenuItem>
          ) : (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === "/"}
                  render={
                    <Link href="/">
                      <Home />
                      <span>Main</span>
                    </Link>
                  }
                />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === "/projects"}
                  render={
                    <Link href="/projects">
                      <FolderKanban />
                      <span>Projects</span>
                    </Link>
                  }
                />
              </SidebarMenuItem>
              {profile.role === "super_admin" && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={pathname.startsWith("/admin/users")}
                    render={
                      <Link href="/admin/users">
                        <Users />
                        <span>User management</span>
                      </Link>
                    }
                  />
                </SidebarMenuItem>
              )}
            </>
          )}
        </SidebarMenu>
      </SidebarHeader>

      {inProjectView && <SidebarSeparator />}

      <SidebarContent>
        {inProjectView && (
          <SidebarGroup>
            <SidebarGroupLabel className="truncate">
              {activeProject?.projectName ?? "Project"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {PROJECT_TABS.map((tab) => {
                  const Icon = tab.icon
                  const href = `/projects/${activeProjectId}?tab=${tab.id}`
                  const isActive =
                    pathname === `/projects/${activeProjectId}` &&
                    activeTab === tab.id
                  return (
                    <SidebarMenuItem key={tab.id}>
                      <SidebarMenuButton
                        isActive={isActive}
                        render={
                          <Link href={href}>
                            <Icon />
                            <span>{tab.label}</span>
                          </Link>
                        }
                      />
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="gap-2">
        <SidebarUserMenu profile={profile} />
        <div className="flex justify-end px-2 pb-1">
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
