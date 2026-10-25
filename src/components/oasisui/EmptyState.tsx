import { Inbox } from "lucide-react";

export default function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed bg-white/70 p-8 text-center">
      <Inbox className="mb-3 h-8 w-8 text-slate-400" />
      <p className="font-semibold text-slate-700">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>}
    </div>
  );
}
