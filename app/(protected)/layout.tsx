import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthHeader } from "@/components/auth-header";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getDashboardAccessInfo } from "@/lib/dashboard-access";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getDashboardAccessInfo();

  // Approved = has a role in Supabase RBAC (public.user_roles -> user_role JWT claim)
  if (!access.isApproved) {
    redirect("/pending-approval");
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4">
          <SidebarTrigger />
          <AuthHeader />
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </SidebarProvider>
  );
}
