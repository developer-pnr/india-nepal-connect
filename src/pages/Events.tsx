import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tag, Plus } from "lucide-react";
import { toast } from "sonner";

type Event = { id: string; name: string; description: string | null; color: string | null; starts_on: string | null; ends_on: string | null; budget_npr: number | null; is_active: boolean };
type Tx = { id: string; event_id: string | null; amount_npr: number; status: string };

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", color: "#3B82F6", starts_on: "", ends_on: "", budget_npr: "" });

  const load = async () => {
    const [e, t] = await Promise.all([
      supabase.from("events" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("transactions").select("id,event_id,amount_npr,status").not("event_id", "is", null),
    ]);
    setEvents((e.data as any) ?? []);
    setTxs((t.data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const spent = (eventId: string) => txs.filter((t) => t.event_id === eventId && t.status !== "cancelled").reduce((s, t) => s + Number(t.amount_npr), 0);
  const count = (eventId: string) => txs.filter((t) => t.event_id === eventId).length;

  const create = async () => {
    if (!form.name) return toast.error("Name required");
    const { error } = await supabase.from("events" as any).insert({
      name: form.name, description: form.description || null, color: form.color,
      starts_on: form.starts_on || null, ends_on: form.ends_on || null,
      budget_npr: form.budget_npr ? Number(form.budget_npr) : null,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Event created");
    setOpen(false);
    setForm({ name: "", description: "", color: "#3B82F6", starts_on: "", ends_on: "", budget_npr: "" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Tag className="h-6 w-6 text-primary" /> Events</h1>
          <p className="text-sm text-muted-foreground">Tag transactions for marriages, festivals, family events</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> New Event</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New event</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sister's wedding" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Starts</Label><Input type="date" value={form.starts_on} onChange={(e) => setForm({ ...form, starts_on: e.target.value })} /></div>
                <div><Label>Ends</Label><Input type="date" value={form.ends_on} onChange={(e) => setForm({ ...form, ends_on: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Budget NPR</Label><Input type="number" value={form.budget_npr} onChange={(e) => setForm({ ...form, budget_npr: e.target.value })} /></div>
                <div><Label>Color</Label><Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter><Button onClick={create}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {events.length === 0 ? (
        <div className="border rounded-md p-12 text-center text-sm text-muted-foreground">No events yet — create one to start tagging transactions.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {events.map((ev) => {
            const used = spent(ev.id);
            const pct = ev.budget_npr ? Math.min(100, (used / Number(ev.budget_npr)) * 100) : 0;
            return (
              <Card key={ev.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: ev.color ?? "#3B82F6" }} />
                    <span className="truncate flex-1">{ev.name}</span>
                    {!ev.is_active && <Badge variant="outline" className="text-xs">archived</Badge>}
                  </CardTitle>
                  {ev.description && <div className="text-xs text-muted-foreground line-clamp-2">{ev.description}</div>}
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Spent</span>
                    <span className="font-mono">रू {used.toLocaleString("en-IN")}</span>
                  </div>
                  {ev.budget_npr && (
                    <>
                      <Progress value={pct} className="h-1.5" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Budget रू {Number(ev.budget_npr).toLocaleString("en-IN")}</span>
                        <span>{pct.toFixed(0)}%</span>
                      </div>
                    </>
                  )}
                  <div className="text-xs text-muted-foreground pt-1">{count(ev.id)} transactions</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
