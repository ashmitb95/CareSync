import { cn } from "@/lib/utils";

export function Spinner({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeMap = { sm: "w-4 h-4 border-2", md: "w-6 h-6 border-2", lg: "w-8 h-8 border-[3px]" };
  return (
    <div
      className={cn(
        "rounded-full animate-spin border-t-transparent",
        sizeMap[size],
        className
      )}
      style={{ borderColor: "var(--cs-primary)", borderTopColor: "transparent" }}
    />
  );
}

export function LoadingState({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <Spinner size="lg" />
      <p className="text-sm" style={{ color: "var(--cs-text-muted)" }}>{message}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {icon && (
        <div
          className="flex items-center justify-center w-12 h-12 rounded-full"
          style={{ backgroundColor: "var(--cs-surface-2)" }}
        >
          {icon}
        </div>
      )}
      <p className="text-sm font-medium" style={{ color: "var(--cs-text)" }}>{title}</p>
      {description && (
        <p className="text-xs max-w-xs" style={{ color: "var(--cs-text-muted)" }}>{description}</p>
      )}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div
        className="flex items-center justify-center w-12 h-12 rounded-full"
        style={{ backgroundColor: "var(--cs-danger-bg)" }}
      >
        <span style={{ color: "var(--cs-danger)", fontSize: "1.25rem" }}>⚠</span>
      </div>
      <p className="text-sm font-medium" style={{ color: "var(--cs-text)" }}>
        {message ?? "Something went wrong"}
      </p>
      {onRetry && (
        <button className="cs-btn-secondary text-xs py-1.5 px-3 mt-1" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
