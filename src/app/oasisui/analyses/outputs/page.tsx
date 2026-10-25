"use client";

import Link from "next/link";
import { ArrowRight, FileOutput } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import OasisLayout from "@/components/oasisui/OasisLayout";

export default function OutputsIndexPage() {
  return <OasisLayout><div className="mb-6"><h1 className="text-3xl font-bold text-slate-900">Outputs</h1><p className="mt-2 text-slate-500">从具体 Analysis 进入输出文件中心。</p></div><Card className="max-w-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><FileOutput className="h-5 w-5 text-blue-600" /> Output centre</CardTitle></CardHeader><CardContent className="space-y-4 text-sm text-slate-600"><p>Oasis API 的输出文件按 Analysis 组织。请在 Analyses 列表中选择任务，查看文件、日志及 tar 下载。</p><Button asChild><Link href="/oasisui/analyses">Browse analyses <ArrowRight /></Link></Button></CardContent></Card></OasisLayout>;
}
