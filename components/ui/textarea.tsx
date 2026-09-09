import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, label, error, id, ...props }, ref) {
    const textareaId = id ?? props.name;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-1.5 block text-sm font-semibold text-ink-700"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "w-full rounded-xl border border-ink-300 bg-white px-3.5 py-2.5 text-sm",
            "placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500",
            error && "border-red-400",
            className,
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
      </div>
    );
  },
);