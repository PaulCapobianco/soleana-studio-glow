import { createFileRoute, Link, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Images,
  ListChecks,
  Star,
  HelpCircle,
  FileText,
  LogOut,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/_authed")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/admin/login" });
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) {
      throw redirect({ to: "/admin/login", search: { reason: "forbidden" } });
    }
  },
  component: AdminLayout,
});

const nav = [
  { to: "/admin/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/admin/photos", label: "Photos", icon: Images },
  { to: "/admin/prestations", label: "Prestations", icon: ListChecks },
  { to: "/admin/avis", label: "Avis", icon: Star },
  { to: "/admin/faq", label: "FAQ", icon: HelpCircle },
  { to: "/admin/pages-seo", label: "Pages SEO", icon: FileText },
  { to: "/admin/parametres", label: "Paramètres", icon: Settings },
];

function AdminLayout() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/admin/login" });
  }

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 border-r border-border bg-surface p-6 flex flex-col">
        <Link to="/" className="font-display text-xl italic text-primary mb-10">
          Soleana Studio
        </Link>
        <nav className="flex-1 space-y-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
              activeProps={{ className: "bg-background text-foreground" }}
            >
              <n.icon className="w-4 h-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="pt-6 border-t border-border space-y-2">
          <p className="text-xs text-muted-foreground truncate">{email}</p>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-3 h-3" /> Déconnexion
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 lg:p-12 overflow-x-auto">
        <Outlet />
      </main>
    </div>
  );
}

export { cn };
