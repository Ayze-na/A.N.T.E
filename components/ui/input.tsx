import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  dir?: "rtl" | "ltr";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, label, error, id, dir = "rtl", ...props }, ref) {
    const inputId = id ?? props.name;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-semibold text-ink-700"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          dir={dir}
          className={cn(
            "h-11 w-full rounded-xl border border-ink-300 bg-white px-3.5 text-sm",
            "placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500",
            error && "border-red-400 focus:ring-red-400/30 focus:border-red-400",
            className,
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
      </div>
    );
  },
);