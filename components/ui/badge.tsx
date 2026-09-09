import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap",
        className ?? "bg-primary-100 text-primary-800",
      )}
    >
      {children}
    </span>
  );
}