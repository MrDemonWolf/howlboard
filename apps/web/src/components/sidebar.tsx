import { useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { useSession } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/lib/trpc";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const COLLAPSED_KEY = "howlboard-sidebar-collapsed";

function SidebarLink({
  to,
  icon,
  children,
  collapsed,
}: {
  to: string;
  icon: string;
  children: React.ReactNode;
  collapsed: boolean;
}) {
  return (
    <NavLink
      to={to}
      end
      title={collapsed ? String(children) : undefined}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
          collapsed && "justify-center px-2",
        )
      }
    >
      <span className="shrink-0 text-base">{icon}</span>
      {!collapsed && <span className="truncate">{children}</span>}
    </NavLink>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSED_KEY) === "true",
  );
  const [search, setSearch] = useState("");
  const { data: session } = useSession();
  const navigate = useNavigate();
  const trpc = useTRPC();
  const user = session?.user;

  const { data: avatarUrl } = useQuery(
    trpc.settings.getAvatar.queryOptions(
      { userId: user?.id ?? "" },
      { enabled: !!user?.id, staleTime: 1000 * 60 * 5 },
    ),
  );

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSED_KEY, String(next));
  }

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-card transition-all duration-200",
        collapsed ? "w-14" : "w-56",
      )}
    >
      {/* User card at top */}
      <button
        onClick={() => navigate("/settings/profile")}
        className="flex items-center gap-2 px-3 py-3 hover:bg-accent transition-colors text-left"
      >
        <Avatar size="sm">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt="Avatar" />
          ) : (
            <AvatarFallback>{initials}</AvatarFallback>
          )}
        </Avatar>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-medium text-foreground">
              @{(user as Record<string, unknown>)?.username as string ?? user?.email?.split("@")[0] ?? "user"}
            </p>
          </div>
        )}
      </button>

      {/* Search */}
      {!collapsed && (
        <div className="px-2 pb-2">
          <Input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-xs"
          />
        </div>
      )}

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-1.5 py-2 overflow-y-auto">
        <SidebarLink to="/" icon="📋" collapsed={collapsed}>Dashboard</SidebarLink>
        <SidebarLink to="/draw" icon="🎨" collapsed={collapsed}>Local Draw</SidebarLink>

        {!collapsed && (
          <div className="pt-3 pb-1 px-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Settings
            </span>
          </div>
        )}
        {collapsed && <Separator className="my-2" />}

        <SidebarLink to="/settings" icon="⚙️" collapsed={collapsed}>General</SidebarLink>
        <SidebarLink to="/settings/profile" icon="👤" collapsed={collapsed}>Profile</SidebarLink>
        <SidebarLink to="/settings/members" icon="👥" collapsed={collapsed}>Members</SidebarLink>
        <SidebarLink to="/settings/collections" icon="📁" collapsed={collapsed}>Collections</SidebarLink>
        <SidebarLink to="/settings/legal" icon="📜" collapsed={collapsed}>Legal</SidebarLink>
      </nav>

      <Separator />

      {/* Footer */}
      <div className="px-2 py-2">
        {!collapsed && (
          <>
            <p className="text-[10px] text-muted-foreground text-center">
              &copy; {new Date().getFullYear()} MrDemonWolf, Inc.
            </p>
            <div className="flex justify-center gap-2 mt-0.5 mb-1">
              <a href="/legal/terms" className="text-[10px] text-muted-foreground hover:text-primary transition-colors">Terms</a>
              <span className="text-[10px] text-muted-foreground">&middot;</span>
              <a href="/legal/privacy" className="text-[10px] text-muted-foreground hover:text-primary transition-colors">Privacy</a>
            </div>
          </>
        )}
        <button
          onClick={toggleCollapsed}
          className="flex w-full items-center justify-center rounded-md py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>
    </aside>
  );
}
