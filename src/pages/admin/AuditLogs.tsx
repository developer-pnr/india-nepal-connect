import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Eye } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState<string>("all");
  const [view, setView] = useState<AuditLog | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500);
      setLogs(data ?? []);
    })();
  }, []);

  const entities = Array.from(new Set(logs.map((l) => l.entity)));
  const filtered = logs.filter((l) =>
    (entity === "all" || l.entity === entity) &&
    (!search || l.action.toLowerCase().includes(search.toLowerCase()) || l.entity.toLowerCase().includes(search.toLowerCase()) || l.entity_id?.includes(search))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">Last 500 changes across the system</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium">Activity Trail ({filtered.length})</CardTitle>
          <div className="flex gap-2">
            <Select value={entity} onValueChange={setEntity}>
              <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                {entities.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-8 h-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Entity ID</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No logs</TableCell></TableRow>
              ) : filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</TableCell>
                  <TableCell><Badge variant="outline" className="font-mono text-[10px]">{l.action}</Badge></TableCell>
                  <TableCell className="text-sm">{l.entity}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{l.entity_id?.slice(0, 8) ?? "—"}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setView(l)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>Audit Log Detail</DialogTitle></DialogHeader>
          {view && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <div><span className="text-muted-foreground">Time:</span> {new Date(view.created_at).toLocaleString()}</div>
                <div><span className="text-muted-foreground">Action:</span> {view.action}</div>
                <div><span className="text-muted-foreground">Entity:</span> {view.entity}</div>
                <div><span className="text-muted-foreground">User:</span> {view.user_id?.slice(0, 8) ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1">Payload</div>
                <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-96">{JSON.stringify(view.payload, null, 2)}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
