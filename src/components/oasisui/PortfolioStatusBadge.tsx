import { cn } from "@/lib/utils";
import type { PortfolioStatus } from "@/lib/oasis/types";

type StatusKind = "exposure" | "validation";

const styles: Record<string, string> = {
  NONE: "bg-slate-100 text-slate-600",
  INSUFFICIENT_DATA: "bg-amber-100 text-amber-700",
  STARTED: "bg-blue-100 text-blue-700",
  ERROR: "bg-red-100 text-red-700",
  RUN_COMPLETED: "bg-emerald-100 text-emerald-700",
};

function labelFor(status: PortfolioStatus | undefined, kind: StatusKind) {
  switch (status) {
    case undefined:
    case "NONE":
      return kind === "validation" ? "Not validated" : "Not generated";
    case "INSUFFICIENT_DATA":
      return "Missing input files";
    case "STARTED":
      return "Running";
    case "ERROR":
      return "Failed";
    case "RUN_COMPLETED":
      return "Completed";
    default:
      return status.replaceAll("_", " ");
  }
}

export default function PortfolioStatusBadge({ status, kind }: { status?: PortfolioStatus; kind: StatusKind }) {
  const key = status || "NONE";
  return (
    <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", styles[key] || "bg-slate-100 text-slate-600")}>
      {labelFor(status, kind)}
    </span>
  );
}
