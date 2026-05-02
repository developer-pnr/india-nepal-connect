import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Users, ArrowLeftRight, UsersRound, ClipboardList, Wrench, Settings } from "lucide-react";

interface Stats {
  users: number;
  txns: number;
  pending: number;
  senders: number;
  payers: number;
  receivers: number;
  recentAudits: number;
}

export default function AdminOverview() {
  const [s, setS] = useState<Stats>({ users: 0, txns: 0, pending: 0, senders: 0, payers: 0, receivers: 0, recentAudits: 0 });

  useEffect(() => {
    (async () => {
      const [u, t, p, sn, pa, rc, al] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("transactions").select("id", { count: "exact", head: true }),
        supabase.from("transactions").select("id", { count: "exact", head: true }).neq("status", "paid").neq("status", "cancelled"),
        supabase.from("senders").select("id", { count: "exact", head: true }),
        supabase.from("payers" as any).select("id", { count: "exact", head: true }),
        supabase.from("receivers").select("id", { count: "exact", head: true }),
        supabase.from("audit_logs").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 86400000).toISOString()),
      ]);
      setS({
        users: u.count ?? 0, txns: t.count ?? 0, pending: p.count ?? 0,
        senders: sn.count ?? 0, payers: pa.count ?? 0, receivers: rc.count ?? 0,
        recentAudits: al.count ?? 0,
      });
    })();
  }, []);

  const tiles = [
    { label: "Users", value: s.users, icon: Users, to: "/admin/users" },
    { label: "Transactions", value: s.txns, icon: ArrowLeftRight, to: "/admin/transactions" },
    { label: "Pending Txns", value: s.pending, icon: ArrowLeftRight, to: "/admin/transactions" },
    { label: "Senders", value: s.senders, icon: UsersRound, to: "/admin/parties" },
    { label: "Payers", value: s.payers, icon: UsersRound, to: "/admin/parties" },
    { label: "Receivers", value: s.receivers, icon: UsersRound, to: "/admin/parties" },
    { label: "Audits (24h)", value: s.recentAudits, icon: ClipboardList, to: "/admin/audit" },
  ];

  const quick = [
    { label: "Maintenance & Recalc", icon: Wrench, to: "/admin/maintenance" },
    { label: "System Settings", icon: Settings, to: "/admin/settings" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin Overview</h1>
        <p className="text-sm text-muted-foreground">System-wide control & monitoring</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <Link key={t.label} to={t.to}>
            <Card className="hover:border-primary/40 transition-colors cursor-pointer">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.label}</CardTitle>
                <t.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-mono font-semibold">{t.value}</div></CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {quick.map((q) => (
            <Link key={q.label} to={q.to}>
              <Card className="hover:border-primary/40 transition-colors cursor-pointer">
                <CardContent className="flex items-center gap-3 py-4">
                  <q.icon className="h-5 w-5 text-primary" />
                  <span className="font-medium">{q.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
