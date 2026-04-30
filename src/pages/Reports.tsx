import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ExportMenu } from "@/components/ExportMenu";
import type { ExportSpec } from "@/lib/exports";

const COLORS = ["hsl(160,60%,38%)", "hsl(38,92%,50%)", "hsl(220,14%,46%)", "hsl(0,72%,51%)", "hsl(280,60%,50%)", "hsl(200,60%,50%)"];
const fmt = (n: number) => (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function Reports() {
  const [txns, setTxns] = useState<any[]>([]);
  const [reportType, setReportType] = useState("monthly");

  useEffect(() => {
    supabase.from("transactions").select("*").order("transaction_date").then(({ data }) => setTxns(data ?? []));
  }, []);

  const monthlyData: Record<string, { inr: number; npr: number; commission_inr: number; commission_npr: number; count: number }> = {};
  txns.forEach((t) => {
    const m = t.transaction_date?.slice(0, 7) ?? "unknown";
    if (!monthlyData[m]) monthlyData[m] = { inr: 0, npr: 0, commission_inr: 0, commission_npr: 0, count: 0 };
    monthlyData[m].inr += Number(t.amount_inr);
    monthlyData[m].npr += Number(t.amount_npr);
    monthlyData[m].commission_inr += Number(t.commission);
    monthlyData[m].commission_npr += Number(t.commission_npr) || (Number(t.commission) * Number(t.exchange_rate));
    monthlyData[m].count++;
  });
  const monthlyChart = Object.entries(monthlyData).map(([month, d]) => ({ month, ...d }));

  const methodData: Record<string, number> = {};
  txns.forEach((t) => { methodData[t.payment_method] = (methodData[t.payment_method] ?? 0) + 1; });
  const pieData = Object.entries(methodData).map(([name, value]) => ({ name: name.replace("_", " "), value }));

  const totals = txns.reduce((acc, t) => {
    const commNpr = Number(t.commission_npr) || (Number(t.commission) * Number(t.exchange_rate));
    return {
      inr: acc.inr + Number(t.amount_inr),
      npr: acc.npr + Number(t.amount_npr),
      commission_inr: acc.commission_inr + Number(t.commission),
      commission_npr: acc.commission_npr + commNpr,
    };
  }, { inr: 0, npr: 0, commission_inr: 0, commission_npr: 0 });

  const exportCSV = () => {
    const headers = "Date,Sender ID,Receiver ID,INR,NPR,Commission INR,Commission NPR,Method,Status\n";
    const rows = txns.map((t) => {
      const commNpr = Number(t.commission_npr) || (Number(t.commission) * Number(t.exchange_rate));
      return `${t.transaction_date},${t.sender_id},${t.receiver_id},${t.amount_inr},${t.amount_npr},${t.commission},${commNpr.toFixed(2)},${t.payment_method},${t.status}`;
    }).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `report-${reportType}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">{txns.length} transactions analyzed</p>
        </div>
        <div className="flex gap-2">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <ExportMenu getSpec={(): ExportSpec => ({
            title: { en: "Remittance Report", hi: "प्रेषण रिपोर्ट", ne: "रेमिट्यान्स रिपोर्ट" },
            subtitle: `${reportType} • ${txns.length} transactions`,
            meta: [
              { label: { en: "Total INR", hi: "कुल INR", ne: "जम्मा INR" }, value: `₹ ${fmt(totals.inr)}` },
              { label: { en: "Total NPR", hi: "कुल NPR", ne: "जम्मा NPR" }, value: `रू ${fmt(totals.npr)}` },
              { label: { en: "Commission INR", hi: "कमीशन INR", ne: "कमिसन INR" }, value: `₹ ${fmt(totals.commission_inr)}` },
              { label: { en: "Commission NPR", hi: "कमीशन NPR", ne: "कमिसन NPR" }, value: `रू ${fmt(totals.commission_npr)}` },
            ],
            columns: [
              { key: "transaction_date", labels: { en: "Date", hi: "दिनांक", ne: "मिति" } },
              { key: "slip_number", labels: { en: "Slip", hi: "पर्ची", ne: "पर्ची" }, format: (v, r) => v ?? r.id?.slice(0,6) },
              { key: "amount_inr", align: "right", labels: { en: "Amount (INR)", hi: "राशि (INR)", ne: "रकम (INR)" }, format: (v) => `₹ ${fmt(v)}` },
              { key: "exchange_rate", align: "right", labels: { en: "Rate", hi: "दर", ne: "दर" }, format: (v) => fmt(v) },
              { key: "amount_npr", align: "right", labels: { en: "Amount (NPR)", hi: "राशि (NPR)", ne: "रकम (NPR)" }, format: (v) => `रू ${fmt(v)}` },
              { key: "commission_npr", align: "right", labels: { en: "Commission (NPR)", hi: "कमीशन (NPR)", ne: "कमिसन (NPR)" }, format: (v, r) => `रू ${fmt(Number(v) || Number(r.commission)*Number(r.exchange_rate))}` },
              { key: "payment_method", labels: { en: "Method", hi: "माध्यम", ne: "माध्यम" } },
              { key: "status", labels: { en: "Status", hi: "स्थिति", ne: "स्थिति" } },
            ],
            rows: txns,
            filenameBase: `report-${reportType}-${new Date().toISOString().split("T")[0]}`,
          })} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Remittance Volume</CardTitle></CardHeader>
          <CardContent>
            {monthlyChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <Tooltip />
                  <Bar dataKey="inr" fill={COLORS[0]} name="INR" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="commission_inr" fill={COLORS[1]} name="Commission ₹" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">No data</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Payment Methods</CardTitle></CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={(e) => e.name}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">No data</div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Profit Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Total INR</p>
              <p className="text-xl font-bold font-mono text-primary">₹{totals.inr.toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total NPR</p>
              <p className="text-xl font-bold font-mono">रू{totals.npr.toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Commission (INR)</p>
              <p className="text-xl font-bold font-mono text-primary">₹{totals.commission_inr.toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Commission (NPR)</p>
              <p className="text-xl font-bold font-mono text-accent">रू{totals.commission_npr.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
