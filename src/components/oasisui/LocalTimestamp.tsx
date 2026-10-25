"use client";

import { useEffect, useState } from "react";
import { formatOasisTimestampInTimeZone } from "@/lib/oasis/format";

type LocalTimestampProps = {
  value: unknown;
  fallback?: string;
  className?: string;
};

export default function LocalTimestamp({ value, fallback = "—", className }: LocalTimestampProps) {
  const [displayValue, setDisplayValue] = useState(() => formatOasisTimestampInTimeZone(value, fallback, "UTC"));

  useEffect(() => {
    setDisplayValue(formatOasisTimestampInTimeZone(value, fallback));
  }, [fallback, value]);

  return <span className={className}>{displayValue}</span>;
}
