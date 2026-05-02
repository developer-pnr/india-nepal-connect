import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

export default function AdminSettings() {
  const [rate, setRate] = useState("");
  const [commission, setCommission] = useState("30");
  const [today, setToday] = useState<{ inr_to_npr: number; commission_rate_npr_per_1000: number } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("daily_rates").select("inr_to_npr, commission_rate_npr_per_1000").order("rate_date", { ascending: false }).limit(1).single();
      if (data) {
        setToday(data as any);
        setRate(String(data.inr_to_npr));
        setCommission(String(data.commission_rate_npr_per_1000));
      }
    })();
  }, []);

  const saveRate = async () => {
    const today_str = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("daily_rates").upsert({
      rate_date: today_str,
      inr_to_npr: parseFloat(rate),
      commission_rate_npr_per_1000: parseFloat(commission),
    }, { onConflict: "rate_date" });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Today's rate updated" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">System Settings</h1>
        <p className="text-sm text-muted-foreground">Defaults & rate configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Today's Exchange Rate</CardTitle>
          <CardDescription className="text-xs">
            Current: 1 INR = <span className="font-mono">{today?.inr_to_npr ?? "—"}</span> NPR · Commission <span className="font-mono">{today?.commission_rate_npr_per_1000 ?? "—"}</span> NPR per 1,000
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>INR → NPR</Label><Input type="number" step="0.0001" value={rate} onChange={(e) => setRate(e.target.value)} /></div>
            <div className="space-y-1"><Label>Commission (NPR per 1,000)</Label><Input type="number" value={commission} onChange={(e) => setCommission(e.target.value)} /></div>
          </div>
          <Button onClick={saveRate}><Save className="h-3.5 w-3.5 mr-1" />Save Today's Rate</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Database Reference</CardTitle>
          <CardDescription className="text-xs">Quick links for advanced configuration</CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div>For rate history & batch updates use the <a href="/rates" className="text-primary underline">Rates page</a>.</div>
          <div>For event budgets see <a href="/events" className="text-primary underline">Events</a>.</div>
          <div>For cash & bank balances see <a href="/accounts" className="text-primary underline">My Accounts</a>.</div>
        </CardContent>
      </Card>
    </div>
  );
}
