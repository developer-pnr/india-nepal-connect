import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";

const channelLabel: Record<string, string> = {
  cash: "Cash NPR", bank_transfer: "Bank NPR", esewa: "eSewa", khalti: "Khalti", ime: "IME", other: "Other",
};

export default function Wallets() {
  const [data, setData] = useState<Record<string, { name: string; channels: Record<string, number>; total: number }>>({});

  useEffect(() => {
    (async () => {
      const [w, p] = await Promise.all([
        supabase.from("payer_wallets" as any).select("*"),
        supabase.from("payers" as any).select("id,name,shop_name"),
      ]);
      const payerMap: Record<string, string> = {};
      (p.data as any)?.forEach((x: any) => { payerMap[x.id] = x.shop_name ? `${x.name} (${x.shop_name})` : x.name; });
      const out: any = {};
      (w.data as any)?.forEach((row: any) => {
        if (!out[row.payer_id]) out[row.payer_id] = { name: payerMap[row.payer_id] ?? "Unknown", channels: {}, total: 0 };
        out[row.payer_id].channels[row.channel] = Number(row.balance_npr);
        out[row.payer_id].total += Number(row.balance_npr);
      });
      setData(out);
    })();
  }, []);

  const entries = Object.entries(data);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Wallet className="h-6 w-6 text-primary" /> Payer Wallets</h1>
        <p className="text-sm text-muted-foreground">Float disbursed by each payer across channels</p>
      </div>

      {entries.length === 0 ? (
        <div className="border rounded-md p-12 text-center text-sm text-muted-foreground">No wallet activity yet — record payments on a transaction to populate wallets.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {entries.map(([id, info]) => (
            <Card key={id}>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center justify-between"><span>{info.name}</span><span className="font-mono text-primary">रू {info.total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span></CardTitle></CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                {Object.entries(info.channels).map(([ch, bal]) => (
                  <div key={ch} className="flex justify-between"><span className="text-muted-foreground">{channelLabel[ch] ?? ch}</span><span className="font-mono">रू {bal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span></div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
