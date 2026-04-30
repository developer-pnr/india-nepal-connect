import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, TrendingDown, IndianRupee } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend, PieChart, Pie, Cell } from "recharts";

type Monthly = { month: string; tx_count: number; inr_total: number; npr_total: number; commission_total: number; paid_total: number; outstanding_total: number };

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))", "#10b981", "#f59e0b"];

export default function Analytics() {
  const [monthly, setMonthly] = useState<Monthly[]>([]);
  const [byPayer, setByPayer] = useState<{ name: string; value: number }[]>([]);
  const [byEvent, setByEvent] = useState<{ name: string; value: number; color: string }[]>([]);
  const [byStatus, setByStatus] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    (async () => {
      const [m, txs, payers, events] = await Promise.all([
        supabase.from("v_monthly_analytics" as any).select("*"),
        supabase.from("transactions").select("amount_npr,status,payer_id,event_id"),
        supabase.from("payers" as any).select("id,name,shop_name"),
        supabase.from("events" as any).select("id,name,color"),
      ]);
      setMonthly(((m.data as any) ?? []).map((r: any) => ({ ...r, month: new Date(r.month).toISOString().slice(0, 7) })));

      const payerMap: Record<string, string> = {};
      (payers.data as any)?.forEach((p: any) => { payerMap[p.id] = p.shop_name ?? p.name; });
      const eventMap: Record<string, { name: string; color: string }> = {};
      (events.data as any)?.forEach((e: any) => { eventMap[e.id] = { name: e.name, color: e.color ?? "#3B82F6" }; });

      const pAgg: Record<string, number> = {};
      const eAgg: Record<string, number> = {};
      const sAgg: Record<string, number> = {};
      (txs.data as any)?.forEach((t: any) => {
        if (t.status === "cancelled") return;
        const amt = Number(t.amount_npr);
        if (t.payer_id) pAgg[t.payer_id] = (pAgg[t.payer_id] ?? 0) + amt;
        if (t.event_id) eAgg[t.event_id] = (eAgg[t.event_id] ?? 0) + amt;
        sAgg[t.status] = (sAgg[t.status] ?? 0) + amt;
      });
      setByPayer(Object.entries(pAgg).map(([id, v]) => ({ name: payerMap[id] ?? "Unknown", value: v })).sort((a, b) => b.value - a.value).slice(0, 8));
      setByEvent(Object.entries(eAgg).map(([id, v]) => ({ name: eventMap[id]?.name ?? "—", value: v, color: eventMap[id]?.color ?? "#3B82F6" })));
      setByStatus(Object.entries(sAgg).map(([k, v]) => ({ name: k, value: v })));
    })();
  }, []);

  const totals = useMemo(() => monthly.reduce((acc, m) => ({
    inr: acc.inr + Number(m.inr_total ?? 0),
    npr: acc.npr + Number(m.npr_total ?? 0),
    commission: acc.commission + Number(m.commission_total ?? 0),
    outstanding: acc.outstanding + Number(m.outstanding_total ?? 0),
  }), { inr: 0, npr: 0, commission: 0, outstanding: 0 }), [monthly]);

  const fmtNpr = (n: number) => `रू ${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  const fmtInr = (n: number) => `₹ ${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" /> Analytics</h1>
        <p className="text-sm text-muted-foreground">Trends, top payers, event spend and outstanding</p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5"><IndianRupee className="h-4 w-4" /> Total INR</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-mono font-semibold">{fmtInr(totals.inr)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total NPR</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-mono font-semibold text-primary">{fmtNpr(totals.npr)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5"><TrendingUp className="h-4 w-4" /> Commission</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-mono font-semibold">{fmtNpr(totals.commission)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5"><TrendingDown className="h-4 w-4" /> Outstanding</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-mono font-semibold text-destructive">{fmtNpr(totals.outstanding)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Monthly volume (NPR)</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
              <Legend />
              <Bar dataKey="npr_total" name="Volume" fill="hsl(var(--primary))" />
              <Bar dataKey="paid_total" name="Paid" fill="hsl(var(--accent))" />
              <Bar dataKey="outstanding_total" name="Outstanding" fill="hsl(var(--destructive))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Commission trend</CardTitle></CardHeader>
        <CardContent className="h-60">
          <ResponsiveContainer>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
              <Line type="monotone" dataKey="commission_total" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Top payers (NPR)</CardTitle></CardHeader>
          <CardContent className="h-72">
            {byPayer.length === 0 ? <div className="text-sm text-muted-foreground">No data</div> :
              <ResponsiveContainer>
                <BarChart data={byPayer} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={100} />
                  <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">By status</CardTitle></CardHeader>
          <CardContent className="h-72">
            {byStatus.length === 0 ? <div className="text-sm text-muted-foreground">No data</div> :
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byStatus} dataKey="value" nameKey="name" outerRadius={90} label={(d: any) => d.name}>
                    {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                </PieChart>
              </ResponsiveContainer>
            }
          </CardContent>
        </Card>
      </div>

      {byEvent.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Spend by event (NPR)</CardTitle></CardHeader>
          <CardContent className="h-60">
            <ResponsiveContainer>
              <BarChart data={byEvent}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="value">
                  {byEvent.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
