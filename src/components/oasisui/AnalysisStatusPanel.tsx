import Link from "next/link";
import { Activity, Clock3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from "./StatusBadge";
import LocalTimestamp from "./LocalTimestamp";
import type { Analysis, RunProgress } from "@/lib/oasis/types";

export default function AnalysisStatusPanel({ analyses, progressById }: { analyses: Analysis[]; progressById?: Record<string, RunProgress | null> }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-blue-600" /> Latest analyses</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {analyses.map((analysis) => {
          const progress = progressById?.[String(analysis.id)];
          const progressValue = typeof progress?.progress === "number" ? progress.progress : undefined;
          return <Link key={String(analysis.id)} href={`/oasisui/analyses/${analysis.id}`} className="block rounded-lg border border-slate-100 bg-slate-50/60 p-3 transition-colors hover:border-blue-200 hover:bg-blue-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><p className="truncate font-semibold text-slate-800">{analysis.name || `Analysis ${analysis.id}`}</p><StatusBadge status={analysis.status} /></div>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" /> <LocalTimestamp value={analysis.modified || analysis.created} fallback="时间未提供" /></p>
              </div>
            </div>
            {progressValue !== undefined && <div className="mt-3"><div className="mb-1 flex justify-between text-xs text-slate-500"><span>Run progress</span><span>{Math.round(progressValue)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500" style={{ width: `${Math.max(0, Math.min(100, progressValue))}%` }} /></div></div>}
          </Link>;
        })}
      </CardContent>
    </Card>
  );
}
