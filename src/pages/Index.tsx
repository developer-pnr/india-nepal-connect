import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeftRight, Clock, IndianRupee, Banknote } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Metrics {
  totalInr: number;
  totalNpr: number;
  totalCommission: number;
  pendingCount: number;
  todayCount: number;
  totalCount: number;
}

export default function Index() {
  const [metrics, setMetrics] = useState<Metrics>({
    totalInr: 0, totalNpr: 0, totalCommission: 0, pendingCount: 0, todayCount: 0, totalCount: 0,
  });
  const [chartData, setChartData] = useState<{ month: string; volume: number }[]>([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      const { data: txns } = await supabase.from("transactions").select("amount_inr, amount_npr, commission, status, transaction_date");
      if (!txns) return;

      const today = new Date().toISOString().split("T")[0];
      const m: Metrics = { totalInr: 0, totalNpr: 0, totalCommission: 0, pendingCount: 0, todayCount: 0, totalCount: txns.length };

      const monthMap: Record<string, number> = {};

      txns.forEach((t) => {
        m.totalInr += Number(t.amount_inr);
        m.totalNpr += Number(t.amount_npr);
        m.totalCommission += Number(t.commission);
        if (t.status === "pending") m.pendingCount++;
        if (t.transaction_date === today) m.todayCount++;

        const month = t.transaction_date?.slice(0, 7) ?? "unknown";
        monthMap[month] = (monthMap[month] ?? 0) + Number(t.amount_inr);
      });

      setMetrics(m);
      setChartData(
        Object.entries(monthMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6)
          .map(([month, volume]) => ({ month, volume }))
      );
    };

    fetchMetrics();
  }, []);

  const cards = [
    { title: "Total INR Received", value: `₹${metrics.totalInr.toLocaleString("en-IN")}`, icon: IndianRupee, color: "text-primary" },
    { title: "Total NPR Paid", value: `रू${metrics.totalNpr.toLocaleString("en-IN")}`, icon: Banknote, color: "text-accent" },
    { title: "Commission Earned", value: `₹${metrics.totalCommission.toLocaleString("en-IN")}`, icon: ArrowLeftRight, color: "text-success" },
    { title: "Pending Payments", value: metrics.pendingCount.toString(), icon: Clock, color: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Liquidity overview — {metrics.todayCount} transfers today, {metrics.totalCount} total
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold font-mono ${c.color}`}>{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Monthly Remittance Volume (INR)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                <YAxis className="text-xs fill-muted-foreground" />
                <Tooltip />
                <Bar dataKey="volume" fill="hsl(160, 60%, 38%)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
              No transaction data yet. Create your first transaction to see charts.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
