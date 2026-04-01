import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "default" | "lg";
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({ size = "default", padding = "md", className, children, ...props }: CardProps) {
  const padMap = { none: "", sm: "p-4", md: "p-5", lg: "p-6" };
  return (
    <div
      className={cn(
        size === "lg" ? "cs-card-lg" : "cs-card",
        padMap[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-between gap-4 mb-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-sm font-semibold leading-tight", className)}
      style={{ color: "var(--cs-text)" }}
      {...props}
    >
      {children}
    </h2>
  );
}

export function CardSubtitle({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-xs mt-0.5", className)}
      style={{ color: "var(--cs-text-muted)" }}
      {...props}
    >
      {children}
    </p>
  );
}

export function Divider({ className }: { className?: string }) {
  return (
    <div
      className={cn("-mx-5 my-4", className)}
      style={{ height: 1, backgroundColor: "var(--cs-border)" }}
    />
  );
}
