import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Database } from "@/integrations/supabase/types";

type LedgerEntry = Database["public"]["Tables"]["ledger_entries"]["Row"];
type LedgerAccount = Database["public"]["Enums"]["ledger_account"];

const accounts: LedgerAccount[] = ["indian_bank", "cash_npr", "bank_npr", "esewa_pool", "khalti_pool", "ime_pool", "commission"];

export default function Ledger() {
  const { hasRole } = useAuth();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [inrAmount, setInrAmount] = useState("");
  const [inrDesc, setInrDesc] = useState("");

  useEffect(() => {
    const fetch = async () => {
      let q = supabase.from("ledger_entries").select("*").order("created_at", { ascending: false }).limit(200);
      if (filter !== "all") q = q.eq("account", filter as LedgerAccount);
      const { data } = await q;
      setEntries(data ?? []);
    };
    fetch();
  }, [filter]);

  // Calculate running balances per account
  const balances: Record<string, { debit: number; credit: number }> = {};
  entries.forEach((e) => {
    if (!balances[e.account]) balances[e.account] = { debit: 0, credit: 0 };
    balances[e.account].debit += Number(e.debit);
    balances[e.account].credit += Number(e.credit);
  });

  const indianBankBalance = balances.indian_bank ? balances.indian_bank.credit - balances.indian_bank.debit : 0;

  const indianBankEntries = entries.filter((e) => e.account === "indian_bank");

  const handleInrEntry = async () => {
    const amount = parseFloat(inrAmount);
    if (!amount || !hasRole("admin")) return;

    const isCredit = amount > 0;
    const absAmount = Math.abs(amount);

    const { error } = await supabase
      .from("ledger_entries")
      .insert({
        account: "indian_bank" as const,
        ...(isCredit ? { credit: absAmount } : { debit: absAmount }),
        description: `INR ${isCredit ? "Deposit" : "Withdrawal"}: ${inrDesc}`,
      });

    if (error) {
      console.error(error);
      return;
    }

    setInrAmount("");
    setInrDesc("");
    // Refetch
    const fetch = async () => {
      let q = supabase.from("ledger_entries").select("*").order("created_at", { ascending: false }).limit(200);
      if (filter !== "all") q = q.eq("account", filter as LedgerAccount);
      const { data } = await q;
      setEntries(data ?? []);
    };
    fetch();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ledger</h1>
        <p className="text-sm text-muted-foreground">Double-entry accounting view</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Object.entries(balances).map(([acct, b]) => (
          <Card key={acct}>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase font-mono">{acct.replace("_", " ")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-sm">
                <span className="text-primary">Dr: {b.debit.toLocaleString("en-IN")}</span>
                <span className="mx-2 text-muted-foreground">|</span>
                <span className="text-accent">Cr: {b.credit.toLocaleString("en-IN")}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* INR Account Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold tracking-tight">INR Account Balance</CardTitle>
          <p className="text-sm text-muted-foreground">indian_bank account (credit - debit)</p>
        </CardHeader>
        <CardContent className="text-center py-12">
          <div className={`text-5xl font-mono font-bold ${indianBankBalance >= 0 ? "text-success" : "text-destructive"}`}>
            ₹{indianBankBalance.toLocaleString("en-IN")}
          </div>
        </CardContent>
      </Card>

      {hasRole("admin") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Manage INR Account</CardTitle>
            <p className="text-sm text-muted-foreground">Add deposit (+) or withdrawal (-) to indian_bank</p>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="inr-amount">Amount (₹)</Label>
                <Input
                  id="inr-amount"
                  type="number"
                  step="0.01"
                  value={inrAmount}
                  onChange={(e) => setInrAmount(e.target.value)}
                  placeholder="1000 or -500"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="inr-desc">Description</Label>
                <Input
                  id="inr-desc"
                  value={inrDesc}
                  onChange={(e) => setInrDesc(e.target.value)}
                  placeholder="Bank deposit XYZ"
                  className="mt-1"
                />
              </div>
            </div>
            <Button onClick={handleInrEntry} className="w-full" disabled={!inrAmount}>
              {parseFloat(inrAmount || "0") > 0 ? "Add Deposit" : "Record Withdrawal"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts</SelectItem>
            {accounts.map((a) => <SelectItem key={a} value={a}>{a.replace("_", " ").toUpperCase()}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* INR History */}
      <Card>
        <CardHeader>
          <CardTitle>INR Account History</CardTitle>
          <p className="text-sm text-muted-foreground">Recent indian_bank entries</p>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Debit (₹)</TableHead>
                  <TableHead className="text-right">Credit (₹)</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {indianBankEntries.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No INR entries yet</TableCell></TableRow>
                ) : indianBankEntries.slice(0, 20).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{new Date(e.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-destructive">{Number(e.debit) > 0 ? `₹${Number(e.debit).toLocaleString("en-IN")}` : "—"}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-success">{Number(e.credit) > 0 ? `₹${Number(e.credit).toLocaleString("en-IN")}` : "—"}</TableCell>
                    <TableCell className="text-sm">{e.description ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No ledger entries</TableCell></TableRow>
            ) : entries.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono text-xs">{new Date(e.created_at).toLocaleDateString()}</TableCell>
                <TableCell><span className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">{e.account.replace("_", " ")}</span></TableCell>
                <TableCell className="text-right font-mono text-sm">{Number(e.debit) > 0 ? Number(e.debit).toLocaleString("en-IN") : "—"}</TableCell>
                <TableCell className="text-right font-mono text-sm">{Number(e.credit) > 0 ? Number(e.credit).toLocaleString("en-IN") : "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{e.description ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
