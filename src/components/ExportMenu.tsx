import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Download, Loader2 } from "lucide-react";
import { exportReportPDF, exportReportImage, type ExportSpec, type Lang } from "@/lib/exports";
import { useToast } from "@/hooks/use-toast";

const langs: { value: Lang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी (Hindi)" },
  { value: "ne", label: "नेपाली (Nepali)" },
  { value: "all", label: "All — Combined (EN | HI | NE)" },
];

export function ExportMenu({ getSpec }: { getSpec: () => ExportSpec }) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const run = async (kind: "pdf" | "png", lang: Lang) => {
    try {
      setBusy(true);
      const spec = getSpec();
      if (kind === "pdf") await exportReportPDF(spec, lang);
      else await exportReportImage(spec, lang);
    } catch (e: any) {
      toast({ title: "Export failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover">
        <DropdownMenuLabel>Download as PDF</DropdownMenuLabel>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>PDF — choose language</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {langs.map((l) => (
              <DropdownMenuItem key={l.value} onClick={() => run("pdf", l.value)}>
                {l.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Download as Image (PNG)</DropdownMenuLabel>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Image — choose language</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {langs.map((l) => (
              <DropdownMenuItem key={l.value} onClick={() => run("png", l.value)}>
                {l.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
