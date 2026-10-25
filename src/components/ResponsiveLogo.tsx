import Image from "next/image";
import { cn } from "@/lib/utils";

type ResponsiveLogoProps = {
  alt?: string;
  className?: string;
};

/** Uses a fixed asset at each breakpoint to prevent logo width jumps. */
export function ResponsiveLogo({ alt = "China Taiping Logo", className }: ResponsiveLogoProps) {
  return (
    <div className={cn("flex h-[43px] flex-none items-center", className)}>
      <Image
        src="/taiping-logo-s.png"
        alt={alt}
        width={82}
        height={82}
        className="block h-[36px] w-[36px] max-w-none object-contain sm:hidden"
        priority
      />
      <Image
        src="/taiping-logo-m.png"
        alt={alt}
        width={383}
        height={82}
        className="hidden h-[43px] w-[200px] max-w-none object-contain sm:max-xl:block"
        priority
      />
      <Image
        src="/taiping-logo-l.png"
        alt={alt}
        width={622}
        height={82}
        className="hidden h-[37px] w-[280px] max-w-none object-contain xl:block"
        priority
      />
    </div>
  );
}
