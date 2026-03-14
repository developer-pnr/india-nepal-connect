import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type DailyRate = Database["public"]["Tables"]["daily_rates"]["Row"];

export default function Rates() {
  const [rates, setRates] = useState<DailyRate[]>([]);
  const [newRate, setNewRate] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const { hasRole, user } = useAuth();
  const { toast } = useToast();

  const fetchRates = async () => {
    const { data } = await supabase.from("daily_rates").select("*").order("rate_date", { ascending: false }).limit(60);
    setRates(data ?? []);
  };

  useEffect(() => { fetchRates(); }, []);

  const handleSet = async () => {
    if (!newRate) return;
    const { error } = await supabase.from("daily_rates").upsert(
      { rate_date: newDate, inr_to_npr: parseFloat(newRate), set_by: user?.id },
      { onConflict: "rate_date" }
    );
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Rate set" });
    setNewRate("");
    fetchRates();
  };

  const latest = rates[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Exchange Rates</h1>
        <p className="text-sm text-muted-foreground">INR → NPR daily rates</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-primary">
              {latest ? `1 INR = ${latest.inr_to_npr} NPR` : "Not set"}
            </div>
            {latest && <p className="text-xs text-muted-foreground mt-1">Set on {latest.rate_date}</p>}
          </CardContent>
        </Card>

        {hasRole("admin") && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Set Rate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Date</Label><Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} /></div>
              <div><Label>Rate (NPR per 1 INR)</Label><Input type="number" step="0.0001" value={newRate} onChange={(e) => setNewRate(e.target.value)} placeholder="1.6000" /></div>
              <Button onClick={handleSet} size="sm" className="w-full">Set Rate</Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">INR → NPR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.length === 0 ? (
              <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-8">No rates set</TableCell></TableRow>
            ) : rates.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-sm">{r.rate_date}</TableCell>
                <TableCell className="text-right font-mono font-medium">{r.inr_to_npr}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
