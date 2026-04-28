import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Scale } from "lucide-react";

const kinds = ["advance_in", "advance_out", "adjustment", "refund"] as const;
const partyKinds = ["sender", "payer", "receiver"] as const;
const channels = ["cash", "bank_transfer", "esewa", "khalti", "ime", "other"] as const;

export default function Settlements() {
  const [rows, setRows] = useState<any[]>([]);
  const [parties, setParties] = useState<{ senders: any[]; payers: any[]; receivers: any[] }>({ senders: [], payers: [], receivers: [] });
  const [open, setOpen] = useState(false);
  const empty = { party_kind: "sender" as any, party_id: "", kind: "advance_in" as any, amount_npr: "", occurred_on: new Date().toISOString().slice(0,10), channel: "cash" as any, reference: "", notes: "" };
  const [form, setForm] = useState(empty);
  const { user } = useAuth();
  const { toast } = useToast();

  const load = async () => {
    const [s, senders, payers, receivers] = await Promise.all([
      supabase.from("settlements" as any).select("*").order("occurred_on", { ascending: false }),
      supabase.from("senders").select("id,name").order("name"),
      supabase.from("payers" as any).select("id,name").order("name"),
      supabase.from("receivers").select("id,name").order("name"),
    ]);
    setRows((s.data as any) ?? []);
    setParties({ senders: senders.data ?? [], payers: (payers.data as any) ?? [], receivers: receivers.data ?? [] });
  };
  useEffect(() => { load(); }, []);

  const partyOptions = form.party_kind === "sender" ? parties.senders : form.party_kind === "payer" ? parties.payers : parties.receivers;
  const partyName = (kind: string, id: string) => {
    const list = kind === "sender" ? parties.senders : kind === "payer" ? parties.payers : parties.receivers;
    return list.find((x: any) => x.id === id)?.name ?? "—";
  };

  const save = async () => {
    if (!form.party_id || !form.amount_npr) { toast({ title: "Fill required fields", variant: "destructive" }); return; }
    const { error } = await supabase.from("settlements" as any).insert({
      party_kind: form.party_kind, party_id: form.party_id, kind: form.kind,
      amount_npr: parseFloat(form.amount_npr), occurred_on: form.occurred_on,
      channel: form.channel, reference: form.reference || null, notes: form.notes || null, created_by: user?.id,
    });
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setOpen(false); setForm(empty); load();
    toast({ title: "Settlement recorded" });
  };

  const kindColor = (k: string) => k === "advance_in" ? "default" : k === "advance_out" ? "secondary" : k === "refund" ? "destructive" : "outline";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Scale className="h-6 w-6 text-primary" /> Settlements & Adjustments</h1>
          <p className="text-sm text-muted-foreground">Track advances paid/received and balance adjustments per party</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New entry</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record settlement</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Party type</Label>
                  <Select value={form.party_kind} onValueChange={(v) => setForm({ ...form, party_kind: v as any, party_id: "" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{partyKinds.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Kind</Label>
                  <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{kinds.map(k => <SelectItem key={k} value={k}>{k.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Party *</Label>
                <Select value={form.party_id} onValueChange={(v) => setForm({ ...form, party_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{partyOptions.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Amount NPR *</Label><Input type="number" value={form.amount_npr} onChange={(e) => setForm({ ...form, amount_npr: e.target.value })} /></div>
                <div><Label>Date</Label><Input type="date" value={form.occurred_on} onChange={(e) => setForm({ ...form, occurred_on: e.target.value })} /></div>
              </div>
              <div>
                <Label>Channel</Label>
                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{channels.map(c => <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Reference</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={save} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Party</TableHead><TableHead>Type</TableHead><TableHead>Kind</TableHead><TableHead className="text-right">NPR</TableHead><TableHead>Channel</TableHead><TableHead>Reference</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No settlements yet</TableCell></TableRow>
            ) : rows.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.occurred_on}</TableCell>
                <TableCell className="font-medium">{partyName(r.party_kind, r.party_id)}</TableCell>
                <TableCell className="text-xs">{r.party_kind}</TableCell>
                <TableCell><Badge variant={kindColor(r.kind) as any}>{r.kind.replace("_"," ")}</Badge></TableCell>
                <TableCell className="text-right font-mono">रू {Number(r.amount_npr).toLocaleString("en-IN")}</TableCell>
                <TableCell className="text-xs">{r.channel ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.reference ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
