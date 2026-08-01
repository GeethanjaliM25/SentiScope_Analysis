import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard,
  ScanText,
  Cpu,
  UserRound,
  LogOut,
  Radar,
  Database,
  Cloud,
  BarChart3,
  Lightbulb,
  FileText,
  ShieldCheck,
} from "lucide-react";

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
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getAccount } from "@/lib/account.functions";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Real-Time Analysis", url: "/analyze", icon: ScanText },
  { title: "Dataset Analysis", url: "/datasets", icon: Database },
  { title: "Word Clouds", url: "/word-clouds", icon: Cloud },
  { title: "Advanced Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Business Insights", url: "/insights", icon: Lightbulb },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Model Information", url: "/model", icon: Cpu },
  { title: "Admin Panel", url: "/admin", icon: ShieldCheck },
  { title: "Profile", url: "/profile", icon: UserRound },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchAccount = useServerFn(getAccount);
  const { data } = useQuery({ queryKey: ["account"], queryFn: () => fetchAccount({}) });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Radar className="h-4 w-4" />
          </span>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold">SentiScope AI</p>
            <p className="truncate text-xs text-muted-foreground">Sentiment Intelligence</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center justify-between gap-2 px-1 py-1 group-data-[collapsible=icon]:hidden">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{data?.profile?.full_name ?? "Account"}</p>
            <Badge variant="secondary" className="mt-1 capitalize">
              {data?.role ?? "viewer"}
            </Badge>
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} tooltip="Sign out">
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
