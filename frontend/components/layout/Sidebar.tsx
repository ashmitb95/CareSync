"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Users,
  Terminal,
  AlertTriangle,
  HeartPulse,
  Settings,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/patients",       icon: Users,         label: "Patients",       description: "Patient roster" },
  { href: "/hl7-inspector",  icon: Terminal,      label: "HL7 Inspector",  description: "Parse & transform messages" },
  { href: "/care-gaps",      icon: AlertTriangle, label: "Care Gaps",      description: "Population alerts" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 flex flex-col w-60"
      style={{ backgroundColor: "var(--cs-nav-bg)", borderRight: "1px solid var(--cs-nav-border)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: "var(--cs-nav-border)" }}>
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ backgroundColor: "var(--cs-primary)" }}
        >
          <HeartPulse size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <div className="font-semibold text-sm leading-tight" style={{ color: "var(--cs-nav-text-active)" }}>
            CareSync
          </div>
          <div className="text-xs leading-tight" style={{ color: "var(--cs-nav-text)" }}>
            Patient Intelligence
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--cs-nav-text)" }}>
          Platform
        </div>
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "cs-nav-item group",
                isActive && "active"
              )}
            >
              <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
              <span className="flex-1 truncate">{label}</span>
              {isActive && (
                <ChevronRight size={12} style={{ color: "var(--cs-primary)" }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t" style={{ borderColor: "var(--cs-nav-border)" }}>
        <Link href="/settings" className="cs-nav-item">
          <Settings size={15} strokeWidth={2} />
          <span>Settings</span>
        </Link>
        <div className="mt-3 px-2 py-2 rounded-lg" style={{ backgroundColor: "var(--cs-nav-item-hover)" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Activity size={11} style={{ color: "var(--cs-primary)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--cs-nav-text-active)" }}>
              HAPI FHIR R4
            </span>
          </div>
          <div className="text-xs" style={{ color: "var(--cs-nav-text)" }}>
            hapi.fhir.org/baseR4
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-xs" style={{ color: "var(--cs-nav-text)" }}>Connected</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
