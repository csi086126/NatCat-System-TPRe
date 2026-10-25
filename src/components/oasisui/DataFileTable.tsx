import type { PortfolioFile } from "@/lib/oasis/types";
import EmptyState from "./EmptyState";
import LocalTimestamp from "./LocalTimestamp";

export default function DataFileTable({ files }: { files: PortfolioFile[] }) {
  if (!files.length) return <EmptyState title="No files available" description="Upload an Oasis-compatible file to begin the workflow." />;
  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">File</th><th className="px-4 py-3">Size</th><th className="px-4 py-3">Updated</th></tr></thead>
        <tbody className="divide-y">
          {files.map((file, index) => <tr key={String(file.id ?? file.file_name ?? file.name ?? index)} className="hover:bg-slate-50"><td className="px-4 py-3 font-medium text-slate-700">{file.file_name || file.name || "Unnamed file"}</td><td className="px-4 py-3 text-slate-500">{file.file_size ? `${Math.round(file.file_size / 1024)} KB` : "—"}</td><td className="px-4 py-3 text-slate-500"><LocalTimestamp value={file.modified || file.created} /></td></tr>)}
        </tbody>
      </table>
    </div>
  );
}
