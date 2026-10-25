"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function BackButton({ className = "" }: { className?: string }) {
  const router = useRouter();

  return (
    <Button variant="ghost" className={className} onClick={() => router.back()}>
      <ArrowLeft />
      Back
    </Button>
  );
}
