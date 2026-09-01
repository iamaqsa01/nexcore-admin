import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Text input primitive. Set `aria-invalid` to show the error border. */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", "aria-invalid": invalid, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        aria-invalid={invalid}
        className={cn(
          "h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors",
          "placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-60",
          invalid ? "border-danger" : "border-input",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
