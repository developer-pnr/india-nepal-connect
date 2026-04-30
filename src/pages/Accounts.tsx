import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Wallet, Plus, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";

type Account = { id: string; name: string; kind: string; currency: "INR" | "NPR"; identifier: string | null; opening_balance: number; is_active: boolean; notes: string | null };
type Movement = { id: string; account_id: string; kind: string; occurred_on: string; amount: number; counter_account_id: string | null; reference: string | null; notes: string | null };

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [openMove, setOpenMove] = useState<{ kind: "deposit" | "withdrawal" | "transfer" } | null>(null);
  const [form, setForm] = useState({ name: "", kind: "bank", currency: "INR", identifier: "", opening_balance: "0", notes: "" });
  const [moveForm, setMoveForm] = useState({ account_id: "", counter_account_id: "", amount: "", occurred_on: new Date().toISOString().slice(0, 10), reference: "", notes: "" });

  const load = async () => {
    setLoading(true);
    const [a, m] = await Promise.all([
      supabase.from("my_accounts" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("account_movements" as any).select("*").order("occurred_on", { ascending: false }).limit(500),
    ]);
    setAccounts((a.data as any) ?? []);
    setMovements((m.data as any) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const balanceOf = (acc: Account) => {
    const opening = Number(acc.opening_balance);
    const delta = movements
      .filter((mv) => mv.account_id === acc.id)
      .reduce((s, mv) => {
        const amt = Number(mv.amount);
        if (["deposit", "transfer_in", "txn_inflow"].includes(mv.kind)) return s + amt;
        if (["withdrawal", "transfer_out", "txn_outflow"].includes(mv.kind)) return s - amt;
        if (mv.kind === "adjustment") return s + amt;
        return s;
      }, 0);
    return opening + delta;
  };

  const totalsByCurrency = accounts.reduce((acc, a) => {
    acc[a.currency] = (acc[a.currency] ?? 0) + balanceOf(a);
    return acc;
  }, {} as Record<string, number>);

  const createAccount = async () => {
    if (!form.name) return toast.error("Name required");
    const { error } = await supabase.from("my_accounts" as any).insert({
      name: form.name, kind: form.kind, currency: form.currency, identifier: form.identifier || null,
      opening_balance: Number(form.opening_balance) || 0, notes: form.notes || null,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Account created");
    setOpenNew(false);
    setForm({ name: "", kind: "bank", currency: "INR", identifier: "", opening_balance: "0", notes: "" });
    load();
  };

  const submitMovement = async () => {
    if (!openMove) return;
    const amt = Number(moveForm.amount);
    if (!moveForm.account_id || !amt) return toast.error("Account & amount required");
    const user = (await supabase.auth.getUser()).data.user;

    if (openMove.kind === "transfer") {
      if (!moveForm.counter_account_id) return toast.error("Destination required");
      const { error } = await supabase.from("account_movements" as any).insert([
        { account_id: moveForm.account_id, counter_account_id: moveForm.counter_account_id, kind: "transfer_out", amount: amt, occurred_on: moveForm.occurred_on, reference: moveForm.reference || null, notes: moveForm.notes || null, created_by: user?.id },
        { account_id: moveForm.counter_account_id, counter_account_id: moveForm.account_id, kind: "transfer_in", amount: amt, occurred_on: moveForm.occurred_on, reference: moveForm.reference || null, notes: moveForm.notes || null, created_by: user?.id },
      ] as any);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("account_movements" as any).insert({
        account_id: moveForm.account_id, kind: openMove.kind, amount: amt, occurred_on: moveForm.occurred_on,
        reference: moveForm.reference || null, notes: moveForm.notes || null, created_by: user?.id,
      } as any);
      if (error) return toast.error(error.message);
    }
    toast.success("Recorded");
    setOpenMove(null);
    setMoveForm({ account_id: "", counter_account_id: "", amount: "", occurred_on: new Date().toISOString().slice(0, 10), reference: "", notes: "" });
    load();
  };

  const fmt = (n: number, ccy: string) => `${ccy === "INR" ? "₹" : "रू"} ${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Wallet className="h-6 w-6 text-primary" /> My Accounts</h1>
          <p className="text-sm text-muted-foreground">Setu bank, personal banks, cash drawers and wallets</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setOpenMove({ kind: "deposit" })}><ArrowDownToLine className="h-4 w-4 mr-1.5" /> Deposit</Button>
          <Button variant="outline" size="sm" onClick={() => setOpenMove({ kind: "withdrawal" })}><ArrowUpFromLine className="h-4 w-4 mr-1.5" /> Withdraw</Button>
          <Button variant="outline" size="sm" onClick={() => setOpenMove({ kind: "transfer" })}><ArrowLeftRight className="h-4 w-4 mr-1.5" /> Transfer</Button>
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> New Account</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New account</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Setu HDFC" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Kind</Label>
                    <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank">Bank</SelectItem>
                        <SelectItem value="cash">Cash drawer</SelectItem>
                        <SelectItem value="wallet">Wallet</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Currency</Label>
                    <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="INR">INR</SelectItem><SelectItem value="NPR">NPR</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Identifier (acct no / UPI)</Label><Input value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} /></div>
                <div><Label>Opening balance</Label><Input type="number" value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: e.target.value })} /></div>
                <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={createAccount}>Create</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {Object.entries(totalsByCurrency).map(([ccy, total]) => (
          <Card key={ccy}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total {ccy}</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-mono font-semibold text-primary">{fmt(total, ccy)}</div></CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="accounts">
        <TabsList><TabsTrigger value="accounts">Accounts</TabsTrigger><TabsTrigger value="movements">Movements</TabsTrigger></TabsList>
        <TabsContent value="accounts" className="space-y-2">
          {loading ? <div className="text-sm text-muted-foreground">Loading…</div> :
            accounts.length === 0 ? <div className="border rounded-md p-12 text-center text-sm text-muted-foreground">No accounts yet.</div> :
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {accounts.map((a) => (
                  <Card key={a.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="truncate">{a.name}</span>
                        <Badge variant="outline" className="text-xs">{a.kind}</Badge>
                      </CardTitle>
                      {a.identifier && <div className="text-xs text-muted-foreground font-mono">{a.identifier}</div>}
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-mono font-semibold text-primary">{fmt(balanceOf(a), a.currency)}</div>
                      <div className="text-xs text-muted-foreground mt-1">Opening: {fmt(Number(a.opening_balance), a.currency)}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
          }
        </TabsContent>
        <TabsContent value="movements">
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Account</TableHead><TableHead>Kind</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Reference</TableHead></TableRow></TableHeader>
            <TableBody>
              {movements.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No movements yet</TableCell></TableRow> :
                movements.map((m) => {
                  const acc = accounts.find((a) => a.id === m.account_id);
                  const isOut = ["withdrawal", "transfer_out", "txn_outflow"].includes(m.kind);
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs">{m.occurred_on}</TableCell>
                      <TableCell>{acc?.name ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{m.kind}</Badge></TableCell>
                      <TableCell className={`text-right font-mono ${isOut ? "text-destructive" : "text-primary"}`}>{isOut ? "-" : "+"}{Number(m.amount).toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.reference ?? m.notes ?? "—"}</TableCell>
                    </TableRow>
                  );
                })
              }
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      <Dialog open={!!openMove} onOpenChange={(v) => !v && setOpenMove(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="capitalize">{openMove?.kind}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{openMove?.kind === "transfer" ? "From" : "Account"}</Label>
              <Select value={moveForm.account_id} onValueChange={(v) => setMoveForm({ ...moveForm, account_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {openMove?.kind === "transfer" && (
              <div><Label>To</Label>
                <Select value={moveForm.counter_account_id} onValueChange={(v) => setMoveForm({ ...moveForm, counter_account_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                  <SelectContent>{accounts.filter((a) => a.id !== moveForm.account_id).map((a) => <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Amount</Label><Input type="number" value={moveForm.amount} onChange={(e) => setMoveForm({ ...moveForm, amount: e.target.value })} /></div>
              <div><Label>Date</Label><Input type="date" value={moveForm.occurred_on} onChange={(e) => setMoveForm({ ...moveForm, occurred_on: e.target.value })} /></div>
            </div>
            <div><Label>Reference</Label><Input value={moveForm.reference} onChange={(e) => setMoveForm({ ...moveForm, reference: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={moveForm.notes} onChange={(e) => setMoveForm({ ...moveForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={submitMovement}>Record</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
