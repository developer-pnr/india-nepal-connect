import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Scale, Plus, ArrowDownCircle, ArrowUpCircle, Search } from "lucide-react";
import { ExportMenu } from "@/components/ExportMenu";
import type { ExportSpec } from "@/lib/exports";

type PartyKind = "sender" | "payer" | "receiver";
type Position = {
  id: string;
  name: string;
  kind: PartyKind;
  obligation: number; // what we OWE them (NPR) — payable side
  paid: number;       // what we have paid them
  advances_in: number;  // money they gave us in advance (or refunded back)
  advances_out: number; // money we paid them in advance
  adjustments: number;  // net debit adjustments
  txCount: number;
  net: number; // >0 we owe them, <0 they owe us
};

const fmt = (n: number) => (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function Lending() {
  const [tab, setTab] = useState<PartyKind>("receiver");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "we_owe" | "they_owe" | "settled">("all");
  const [positions, setPositions] = useState<Position[]>([]);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Position | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const empty = {
    kind: "advance_out" as "advance_in" | "advance_out" | "adjustment" | "refund",
    amount_npr: "", occurred_on: new Date().toISOString().slice(0, 10),
    channel: "cash" as "cash" | "bank_transfer" | "esewa" | "khalti" | "ime" | "other",
    reference: "", notes: "",
  };
  const [form, setForm] = useState(empty);

  const load = async () => {
    const [s, p, r, tx, st] = await Promise.all([
      supabase.from("senders").select("id,name").order("name"),
      supabase.from("payers" as any).select("id,name").order("name"),
      supabase.from("receivers").select("id,name").order("name"),
      supabase.from("transactions").select("id,sender_id,payer_id,receiver_id,amount_npr,commission_npr,paid_amount_npr,status"),
      supabase.from("settlements" as any).select("party_kind,party_id,kind,amount_npr"),
    ]);

    const lists: Record<PartyKind, any[]> = {
      sender: s.data ?? [],
      payer: (p.data as any) ?? [],
      receiver: r.data ?? [],
    };

    const map = new Map<string, Position>();
    (Object.keys(lists) as PartyKind[]).forEach((k) => {
      lists[k].forEach((row: any) =>
        map.set(`${k}:${row.id}`, {
          id: row.id, name: row.name, kind: k,
          obligation: 0, paid: 0, advances_in: 0, advances_out: 0, adjustments: 0,
          txCount: 0, net: 0,
        })
      );
    });

    // Transactions: receiver/payer → we owe them payable; paid reduces it.
    // Sender → they owe us amount_inr-equivalent (payable side from their angle is inverse).
    (tx.data ?? []).forEach((t: any) => {
      const payable = Number(t.amount_npr) - Number(t.commission_npr);
      const paid = Number(t.paid_amount_npr || 0);

      const apply = (k: PartyKind, id: string | null, weOwe: boolean) => {
        if (!id) return;
        const key = `${k}:${id}`;
        const pos = map.get(key);
        if (!pos) return;
        if (weOwe) {
          pos.obligation += payable;
          pos.paid += paid;
        } else {
          // sender owes us
          pos.obligation -= payable;
          pos.paid -= paid;
        }
        pos.txCount += 1;
      };

      apply("sender", t.sender_id, false);
      apply("payer", t.payer_id, true);
      apply("receiver", t.receiver_id, true);
    });

    // Settlements
    (st.data ?? []).forEach((row: any) => {
      const key = `${row.party_kind}:${row.party_id}`;
      const pos = map.get(key);
      if (!pos) return;
      const amt = Number(row.amount_npr);
      if (row.kind === "advance_out") pos.advances_out += amt;
      else if (row.kind === "advance_in") pos.advances_in += amt;
      else if (row.kind === "refund") pos.advances_in += amt;
      else if (row.kind === "adjustment") pos.adjustments += amt;
    });

    // Net = obligation - paid - advances_out + advances_in - adjustments
    // Positive net = we still owe them; Negative = they owe us / we have advance with them.
    const result = Array.from(map.values()).map((p) => ({
      ...p,
      net: p.obligation - p.paid - p.advances_out + p.advances_in - p.adjustments,
    }));

    setPositions(result);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return positions
      .filter((p) => p.kind === tab)
      .filter((p) => search ? p.name.toLowerCase().includes(search.toLowerCase()) : true)
      .filter((p) => {
        if (filter === "all") return true;
        if (filter === "settled") return Math.abs(p.net) < 0.5;
        if (filter === "we_owe") return p.net > 0.5;
        if (filter === "they_owe") return p.net < -0.5;
        return true;
      })
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [positions, tab, search, filter]);

  const summary = useMemo(() => {
    const list = positions.filter((p) => p.kind === tab);
    return list.reduce(
      (acc, p) => {
        if (p.net > 0.5) acc.we_owe += p.net;
        else if (p.net < -0.5) acc.they_owe += -p.net;
        else acc.settled += 1;
        return acc;
      },
      { we_owe: 0, they_owe: 0, settled: 0 }
    );
  }, [positions, tab]);

  const recordSettlement = async (kind: typeof form.kind, p: Position) => {
    setTarget(p);
    setForm({ ...empty, kind });
    setOpen(true);
  };

  const save = async () => {
    if (!target || !form.amount_npr) {
      toast({ title: "Amount required", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("settlements" as any).insert({
      party_kind: target.kind,
      party_id: target.id,
      kind: form.kind,
      amount_npr: parseFloat(form.amount_npr),
      occurred_on: form.occurred_on,
      channel: form.channel,
      reference: form.reference || null,
      notes: form.notes || null,
      created_by: user?.id,
    });
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    setOpen(false);
    setForm(empty);
    setTarget(null);
    load();
    toast({ title: "Settlement recorded" });
  };

  const buildSpec = (): ExportSpec => ({
    title: { en: "Lending & Borrowing", hi: "उधार लेन-देन", ne: "ऋण लेनदेन" },
    subtitle: `${tab.toUpperCase()}S — Net positions`,
    meta: [
      { label: { en: "We Owe (Total)", hi: "हम पर बकाया", ne: "हामी तिर्नुपर्ने" }, value: `रू ${fmt(summary.we_owe)}` },
      { label: { en: "They Owe Us (Total)", hi: "हमें मिलना है", ne: "हामीले पाउने" }, value: `रू ${fmt(summary.they_owe)}` },
      { label: { en: "Settled Parties", hi: "सेटल्ड पक्ष", ne: "मिलाइएका पक्ष" }, value: String(summary.settled) },
    ],
    columns: [
      { key: "name", labels: { en: "Party", hi: "पक्ष", ne: "पक्ष" } },
      { key: "txCount", align: "right", labels: { en: "Txns", hi: "लेनदेन", ne: "कारोबार" } },
      { key: "obligation", align: "right", labels: { en: "Obligation (NPR)", hi: "देयता (NPR)", ne: "दायित्व (NPR)" }, format: (v) => fmt(v) },
      { key: "paid", align: "right", labels: { en: "Paid (NPR)", hi: "भुगतान (NPR)", ne: "भुक्तानी (NPR)" }, format: (v) => fmt(v) },
      { key: "advances_out", align: "right", labels: { en: "Advance Paid", hi: "अग्रिम दिया", ne: "अग्रिम दिएको" }, format: (v) => fmt(v) },
      { key: "advances_in", align: "right", labels: { en: "Advance Received", hi: "अग्रिम लिया", ne: "अग्रिम पाएको" }, format: (v) => fmt(v) },
      { key: "net", align: "right", labels: { en: "Net (NPR)", hi: "शुद्ध (NPR)", ne: "खुद (NPR)" }, format: (v) => `${v > 0 ? "+" : ""}${fmt(v)}` },
    ],
    rows: filtered,
    filenameBase: `lending-${tab}`,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" /> Lending & Borrowing
          </h1>
          <p className="text-sm text-muted-foreground">Net position per party — who owes whom, with quick advance/repayment actions</p>
        </div>
        <ExportMenu getSpec={buildSpec} />
      </div>

      {/* Top summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">We Owe Them</CardTitle></CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold text-destructive">रू {fmt(summary.we_owe)}</div>
            <div className="text-xs text-muted-foreground mt-1">Outstanding payables</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">They Owe Us</CardTitle></CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold text-primary">रू {fmt(summary.they_owe)}</div>
            <div className="text-xs text-muted-foreground mt-1">Advances given / receivables</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Settled Parties</CardTitle></CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold text-accent">{summary.settled}</div>
            <div className="text-xs text-muted-foreground mt-1">Net position ≈ 0</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as PartyKind)}>
        <TabsList>
          <TabsTrigger value="receiver">Receivers</TabsTrigger>
          <TabsTrigger value="payer">Payers / Mediators</TabsTrigger>
          <TabsTrigger value="sender">Senders</TabsTrigger>
        </TabsList>

        <div className="flex flex-wrap gap-2 items-center mt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search party..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="we_owe">We owe them</SelectItem>
              <SelectItem value="they_owe">They owe us</SelectItem>
              <SelectItem value="settled">Settled (≈0)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="border rounded-md p-12 text-center text-muted-foreground text-sm">No parties match this filter.</div>
          ) : filtered.map((p) => {
            const status = Math.abs(p.net) < 0.5 ? "settled" : p.net > 0 ? "we_owe" : "they_owe";
            return (
              <Card key={p.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex-1 min-w-[220px]">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{p.name}</h3>
                        <Badge variant={status === "settled" ? "outline" : status === "we_owe" ? "destructive" : "default"}>
                          {status === "settled" ? "Settled" : status === "we_owe" ? "We owe" : "They owe"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{p.txCount} txns</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3 text-xs">
                        <div><div className="text-muted-foreground">Obligation</div><div className="font-mono">रू {fmt(p.obligation)}</div></div>
                        <div><div className="text-muted-foreground">Paid</div><div className="font-mono text-accent">रू {fmt(p.paid)}</div></div>
                        <div><div className="text-muted-foreground">Adv. paid</div><div className="font-mono">रू {fmt(p.advances_out)}</div></div>
                        <div><div className="text-muted-foreground">Adv. received</div><div className="font-mono">रू {fmt(p.advances_in)}</div></div>
                        <div>
                          <div className="text-muted-foreground">Net</div>
                          <div className={`font-mono font-bold ${p.net > 0.5 ? "text-destructive" : p.net < -0.5 ? "text-primary" : "text-muted-foreground"}`}>
                            {p.net > 0 ? "+" : ""}{fmt(p.net)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 self-center">
                      <Button size="sm" variant="outline" onClick={() => recordSettlement("advance_out", p)}>
                        <ArrowUpCircle className="h-3.5 w-3.5 mr-1" /> Pay/Advance
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => recordSettlement("advance_in", p)}>
                        <ArrowDownCircle className="h-3.5 w-3.5 mr-1" /> Receive
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => recordSettlement("adjustment", p)}>
                        Adjust
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {form.kind === "advance_out" ? "Pay / Record Advance" : form.kind === "advance_in" ? "Receive Money" : form.kind === "refund" ? "Record Refund" : "Adjust Balance"}
              {target ? ` — ${target.name}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Amount NPR *</Label>
                <Input type="number" value={form.amount_npr} onChange={(e) => setForm({ ...form, amount_npr: e.target.value })} />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.occurred_on} onChange={(e) => setForm({ ...form, occurred_on: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Channel</Label>
              <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["cash", "bank_transfer", "esewa", "khalti", "ime", "other"] as const).map((c) => (
                    <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Reference</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Receipt no., notes…" /></div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button onClick={save} className="w-full"><Plus className="h-4 w-4 mr-1" /> Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
