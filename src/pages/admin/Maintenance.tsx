import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Wrench, RefreshCw, AlertTriangle, Database } from "lucide-react";

export default function AdminMaintenance() {
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const { toast } = useToast();

  const recalcWallets = async () => {
    setRunning("wallets"); setResult(null);
    try {
      const { data: insts } = await supabase.from("payment_installments").select("payer_id, channel, amount_npr");
      const map = new Map<string, number>();
      (insts ?? []).forEach((i: any) => {
        if (!i.payer_id) return;
        const k = `${i.payer_id}::${i.channel}`;
        map.set(k, (map.get(k) ?? 0) + Number(i.amount_npr));
      });
      let updated = 0;
      for (const [k, v] of map.entries()) {
        const [payer_id, channel] = k.split("::");
        const { error } = await supabase.from("payer_wallets" as any)
          .upsert({ payer_id, channel, balance_npr: v }, { onConflict: "payer_id,channel" });
        if (!error) updated++;
      }
      setResult(`✓ Recalculated ${updated} wallet balances from ${insts?.length ?? 0} installments.`);
      toast({ title: "Wallets recalculated" });
    } catch (e: any) {
      setResult(`✗ ${e.message}`);
    } finally { setRunning(null); }
  };

  const recalcTxnPayments = async () => {
    setRunning("txns"); setResult(null);
    try {
      const { data: txns } = await supabase.from("transactions").select("id, amount_npr, commission_npr, status");
      const { data: insts } = await supabase.from("payment_installments").select("transaction_id, amount_npr");
      const paidMap = new Map<string, number>();
      (insts ?? []).forEach((i: any) => paidMap.set(i.transaction_id, (paidMap.get(i.transaction_id) ?? 0) + Number(i.amount_npr)));

      let updated = 0;
      for (const t of txns ?? []) {
        if (t.status === "cancelled") continue;
        const paid = paidMap.get(t.id) ?? 0;
        const payable = Number(t.amount_npr) - Number(t.commission_npr);
        const newStatus = paid <= 0 ? "pending" : paid >= payable ? "paid" : "partially_paid";
        const { error } = await supabase.from("transactions").update({ paid_amount_npr: paid, status: newStatus }).eq("id", t.id);
        if (!error) updated++;
      }
      setResult(`✓ Recalculated ${updated} transactions.`);
      toast({ title: "Transactions recalculated" });
    } catch (e: any) {
      setResult(`✗ ${e.message}`);
    } finally { setRunning(null); }
  };

  const tools = [
    {
      key: "wallets", title: "Recalculate Payer Wallet Balances",
      desc: "Rebuild every payer wallet balance from the sum of payment installments. Use after manual edits.",
      icon: RefreshCw, action: recalcWallets, danger: false,
    },
    {
      key: "txns", title: "Recalculate Transaction Paid Amounts",
      desc: "Rebuild paid_amount_npr and status on every transaction from its installments.",
      icon: Database, action: recalcTxnPayments, danger: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Maintenance</h1>
        <p className="text-sm text-muted-foreground">Data integrity & repair utilities</p>
      </div>

      <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2 text-sm">
        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
        <div>
          <div className="font-medium">Use with care</div>
          <div className="text-muted-foreground text-xs">These tools rewrite derived data. They are safe to re-run, but you should know what they do before clicking.</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tools.map((t) => (
          <Card key={t.key}>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2"><t.icon className="h-4 w-4" />{t.title}</CardTitle>
              <CardDescription className="text-xs">{t.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="sm" variant="outline" disabled={running !== null} onClick={t.action}>
                <Wrench className="h-3.5 w-3.5 mr-1" />{running === t.key ? "Running…" : "Run"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {result && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Result</CardTitle></CardHeader>
          <CardContent><pre className="text-xs font-mono whitespace-pre-wrap">{result}</pre></CardContent>
        </Card>
      )}
    </div>
  );
}
