import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  RUN_COMPLETED: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  SUCCESS: "bg-emerald-100 text-emerald-700",
  READY: "bg-emerald-100 text-emerald-700",
  RUN_STARTED: "bg-blue-100 text-blue-700",
  RUN_QUEUED: "bg-blue-100 text-blue-700",
  STARTED: "bg-blue-100 text-blue-700",
  RUNNING: "bg-blue-100 text-blue-700",
  QUEUED: "bg-blue-100 text-blue-700",
  INPUTS_GENERATION_STARTED: "bg-blue-100 text-blue-700",
  INPUTS_GENERATION_QUEUED: "bg-blue-100 text-blue-700",
  RUN_ERROR: "bg-red-100 text-red-700",
  ERROR: "bg-red-100 text-red-700",
  FAILED: "bg-red-100 text-red-700",
  INPUTS_GENERATION_ERROR: "bg-red-100 text-red-700",
  RUN_CANCELLED: "bg-amber-100 text-amber-700",
  CANCELLED: "bg-amber-100 text-amber-700",
  INPUTS_GENERATION_CANCELLED: "bg-amber-100 text-amber-700",
  NEW: "bg-slate-100 text-slate-700",
};

export default function StatusBadge({ status }: { status?: string }) {
  const value = status || "UNKNOWN";
  const style = styles[value] || styles[value.toUpperCase()];
  return (
    <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", style || "bg-slate-100 text-slate-600")}>
      {value.replaceAll("_", " ")}
    </span>
  );
}
