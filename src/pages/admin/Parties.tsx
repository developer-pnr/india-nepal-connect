import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, ArrowRightLeft, Copy } from "lucide-react";

type PartyKind = "sender" | "payer" | "receiver";

interface Party {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  shop_name?: string | null;
  district?: string | null;
}

export default function AdminParties() {
  const [tab, setTab] = useState<PartyKind>("sender");
  const [data, setData] = useState<Party[]>([]);
  const [search, setSearch] = useState("");
  const [convert, setConvert] = useState<Party | null>(null);
  const [target, setTarget] = useState<PartyKind>("payer");
  const [mode, setMode] = useState<"copy" | "move">("copy");
  const { toast } = useToast();

  const tableFor = (k: PartyKind) => (k === "sender" ? "senders" : k === "payer" ? "payers" : "receivers");

  const fetchData = async () => {
    const { data: rows } = await supabase.from(tableFor(tab) as any).select("*").order("name");
    setData((rows as any) ?? []);
  };

  useEffect(() => { fetchData(); }, [tab]);

  const performConvert = async () => {
    if (!convert) return;
    if (target === tab) return toast({ title: "Choose a different target role", variant: "destructive" });

    // Map fields between schemas
    const payload: any = {
      name: convert.name,
      phone: convert.phone ?? null,
      address: convert.address ?? null,
    };
    if (target === "payer") {
      payload.shop_name = convert.shop_name ?? null;
      payload.district = convert.district ?? null;
    }
    if (target === "receiver") {
      payload.district = convert.district ?? null;
      payload.payment_mode = "cash";
    }

    const { data: inserted, error } = await supabase.from(tableFor(target) as any).insert(payload).select("id").single();
    if (error) return toast({ title: "Insert failed", description: error.message, variant: "destructive" });

    await supabase.from("audit_logs").insert({
      action: mode === "move" ? "PARTY_MOVE" : "PARTY_COPY",
      entity: target,
      entity_id: (inserted as any).id,
      payload: { from_kind: tab, from_id: convert.id, to_kind: target, to_id: (inserted as any).id, fields: payload },
    });

    if (mode === "move") {
      // Only delete from source if no FK references — safest is to mark inactive when possible
      if (tab === "payer") {
        await supabase.from("payers" as any).update({ is_active: false }).eq("id", convert.id);
      } else {
        // senders/receivers may still be referenced by transactions; we don't delete to preserve history
        toast({ title: "Original kept", description: "Source record preserved (referenced by transactions)." });
      }
    }

    toast({ title: `Converted to ${target}` });
    setConvert(null);
    fetchData();
  };

  const filtered = data.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.phone?.includes(search));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Parties</h1>
        <p className="text-sm text-muted-foreground">Convert a contact between sender / payer / receiver roles</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as PartyKind)}>
        <TabsList>
          <TabsTrigger value="sender">Senders</TabsTrigger>
          <TabsTrigger value="payer">Payers / Shops</TabsTrigger>
          <TabsTrigger value="receiver">Receivers</TabsTrigger>
        </TabsList>

        {(["sender", "payer", "receiver"] as PartyKind[]).map((k) => (
          <TabsContent key={k} value={k} className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium uppercase tracking-wider">{k}s ({filtered.length})</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-8 h-9" />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>{k === "payer" ? "Shop" : "Address"}</TableHead>
                      <TableHead>District</TableHead>
                      <TableHead className="text-right">Convert</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No records</TableCell></TableRow>
                    ) : filtered.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.phone ?? "—"}</TableCell>
                        <TableCell className="text-sm">{k === "payer" ? p.shop_name ?? "—" : p.address ?? "—"}</TableCell>
                        <TableCell className="text-sm">{p.district ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => { setConvert(p); setTarget(k === "sender" ? "payer" : "sender"); setMode("copy"); }}>
                            <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />Convert
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!convert} onOpenChange={(o) => !o && setConvert(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Convert Party</DialogTitle></DialogHeader>
          {convert && (
            <div className="space-y-4">
              <div className="text-sm">
                <Badge variant="secondary" className="font-mono uppercase mr-2">{tab}</Badge>
                <span className="font-medium">{convert.name}</span>
              </div>
              <div className="space-y-1">
                <Label>Convert to role</Label>
                <Select value={target} onValueChange={(v) => setTarget(v as PartyKind)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["sender", "payer", "receiver"] as PartyKind[]).filter((k) => k !== tab).map((k) => (
                      <SelectItem key={k} value={k}>{k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Mode</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="copy">Copy (keep original)</SelectItem>
                    <SelectItem value="move">Move (deactivate original where safe)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <Copy className="h-3 w-3 mt-0.5 flex-shrink-0" />
                Records referenced by existing transactions are never hard-deleted. Move only deactivates payers; sender/receiver originals are preserved for history.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvert(null)}>Cancel</Button>
            <Button onClick={performConvert}>Convert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
