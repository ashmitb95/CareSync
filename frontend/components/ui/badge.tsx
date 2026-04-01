import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger" | "info" | "outline";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: "sm" | "md";
  className?: string;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:  "bg-[var(--cs-surface-2)] text-[var(--cs-text-secondary)] border border-[var(--cs-border)]",
  primary:  "bg-[var(--cs-primary-muted)] text-[var(--cs-primary-dark)] border border-[color-mix(in_srgb,var(--cs-primary)_20%,transparent)]",
  success:  "bg-[var(--cs-success-bg)] text-[var(--cs-success)] border border-[color-mix(in_srgb,var(--cs-success)_20%,transparent)]",
  warning:  "bg-[var(--cs-warning-bg)] text-[var(--cs-warning)] border border-[color-mix(in_srgb,var(--cs-warning)_20%,transparent)]",
  danger:   "bg-[var(--cs-danger-bg)] text-[var(--cs-danger)] border border-[color-mix(in_srgb,var(--cs-danger)_20%,transparent)]",
  info:     "bg-[var(--cs-info-bg)] text-[var(--cs-info)] border border-[color-mix(in_srgb,var(--cs-info)_20%,transparent)]",
  outline:  "bg-transparent text-[var(--cs-text-secondary)] border border-[var(--cs-border-strong)]",
};

const sizeStyles = {
  sm: "px-1.5 py-0.5 text-[11px] font-medium rounded",
  md: "px-2.5 py-0.5 text-xs font-medium rounded-md",
};

export function Badge({ variant = "default", size = "md", className, children }: BadgeProps) {
  return (
    <span className={cn("inline-flex items-center leading-none", sizeStyles[size], variantStyles[variant], className)}>
      {children}
    </span>
  );
}

/** Severity badge for care gaps */
export function SeverityBadge({ severity }: { severity: "low" | "medium" | "high" }) {
  const map = {
    low:    { variant: "info"    as const, label: "Low" },
    medium: { variant: "warning" as const, label: "Medium" },
    high:   { variant: "danger"  as const, label: "High" },
  };
  const { variant, label } = map[severity];
  return <Badge variant={variant} size="sm">{label}</Badge>;
}
