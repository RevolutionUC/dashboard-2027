"use client";

import {
  CalendarDays,
  CalendarRange,
  ChevronRight,
  ClipboardList,
  FolderKanban,
  Gavel,
  Home,
  Inbox,
  QrCode,
  NotepadText,
  ScrollText,
  Search,
  ShieldCheck,
  TrendingUp,
  Trophy,
  ChartLine,
} from "lucide-react";
import { type ComponentType, useEffect, useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";

// Menu items (without Plan and Judging, which have sub-items).
const items = [
  { title: "Registration", url: "/registration", icon: ClipboardList, roles: ["admin", "lead"] },
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "QR",
    url: "/qr",
    icon: QrCode,
  },
  {
    title: "Event Stats",
    url: "/event-stats",
    icon: ChartLine,
  },
  {
    title: "Emails",
    url: "/emails",
    icon: Inbox,
    roles: ["admin", "lead"],
  },
  {
    title: "Search",
    url: "/search",
    icon: Search,
  },
];

const planSubItems = [
  {
    title: "Day of Schedule",
    url: "/plan/day-of-schedule",
    icon: CalendarDays,
  },
  {
    title: "Events",
    url: "/plan/events",
    icon: CalendarRange,
  },
];

const judgingSubItems = [
  {
    title: "Judges & Categories",
    url: "/judges-and-categories",
    icon: Gavel,
  },
  {
    title: "Projects",
    url: "/projects",
    icon: FolderKanban,
  },
  {
    title: "Assignments",
    url: "/assignments",
    icon: ClipboardList,
  },
  {
    title: "General Scorings",
    url: "/generalScorings",
    icon: TrendingUp,
  },
  {
    title: "Category Scorings",
    url: "/categoryScorings",
    icon: Trophy,
  },
];

type SidebarSubItem = {
  title: string;
  url: string;
  icon: ComponentType<{ className?: string }>;
};

function CollapsibleSidebarSection({
  icon: Icon,
  label,
  items,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  items: SidebarSubItem[];
}) {
  return (
    <Collapsible defaultOpen className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton>
            <Icon />
            <span>{label}</span>
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {items.map((item) => (
              <SidebarMenuSubItem key={item.title}>
                <SidebarMenuSubButton asChild>
                  <Link href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function AppSidebar() {
  const { data: session } = authClient.useSession();
  const [dashboardRole, setDashboardRole] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/user/role")
        .then((res) => res.json())
        .then((data) => setDashboardRole(data.dashboardRole || "lead"))
        .catch(() => setDashboardRole("lead"));
    }
  }, [session?.user]);

  const isAdmin = dashboardRole === "admin";
  const isOrganizer = dashboardRole === "organizer";
  const isLoading = dashboardRole === null;

  return (
    <Sidebar>
      <SidebarContent>
        {isLoading ? (
          <SidebarGroup>
            <SidebarGroupLabel>Loading...</SidebarGroupLabel>
          </SidebarGroup>
        ) : (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Application</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items
                    .filter((item) => !item.roles || item.roles.includes(dashboardRole || ""))
                    .map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <Link href={item.url}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}

                  {/* Plan with collapsible sub-menu - not for organizers */}
                  {!isOrganizer && (
                    <CollapsibleSidebarSection
                      icon={NotepadText}
                      label="Plan"
                      items={planSubItems}
                    />
                  )}

                  {/* Judging with collapsible sub-menu */}
                  <CollapsibleSidebarSection icon={Gavel} label="Judging" items={judgingSubItems} />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {isAdmin && (
              <SidebarGroup>
                <SidebarGroupLabel>Admin</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <a href="/admin/approvals">
                          <ShieldCheck />
                          <span>Approvals</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <a href="/admin/logs">
                          <ScrollText />
                          <span>Audit Logs</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
