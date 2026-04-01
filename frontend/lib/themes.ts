/**
 * CareSync Theme System
 *
 * To change the app palette, pick a theme from `themes` and call
 * `applyTheme(themes.ocean)` — or build your own Theme object.
 *
 * Every --cs-* variable in globals.css is mapped here.
 */

export interface Theme {
  name: string;
  // Primary
  primary: string;
  primaryHover: string;
  primaryMuted: string;
  primaryLight: string;
  primaryDark: string;
  // Surfaces
  bg: string;
  surface: string;
  surface2: string;
  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  // Borders
  border: string;
  borderStrong: string;
  // Semantic
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  danger: string;
  dangerBg: string;
  info: string;
  infoBg: string;
  // Nav
  navBg: string;
  navBorder: string;
  navText: string;
  navTextActive: string;
  navItemActive: string;
  navItemHover: string;
}

export const themes: Record<string, Theme> = {
  // Clinical Teal — default
  clinical: {
    name: "Clinical Teal",
    primary:        "#0f766e",
    primaryHover:   "#0d9488",
    primaryMuted:   "#f0fdfa",
    primaryLight:   "#14b8a6",
    primaryDark:    "#115e59",
    bg:             "#f8fafc",
    surface:        "#ffffff",
    surface2:       "#f1f5f9",
    text:           "#0f172a",
    textSecondary:  "#475569",
    textMuted:      "#94a3b8",
    border:         "#e2e8f0",
    borderStrong:   "#cbd5e1",
    success:        "#059669",
    successBg:      "#ecfdf5",
    warning:        "#d97706",
    warningBg:      "#fffbeb",
    danger:         "#dc2626",
    dangerBg:       "#fef2f2",
    info:           "#2563eb",
    infoBg:         "#eff6ff",
    navBg:          "#0f172a",
    navBorder:      "#1e293b",
    navText:        "#94a3b8",
    navTextActive:  "#f8fafc",
    navItemActive:  "#0f766e",
    navItemHover:   "#1e293b",
  },

  // Cobalt Blue — alternative
  cobalt: {
    name: "Cobalt Blue",
    primary:        "#1d4ed8",
    primaryHover:   "#2563eb",
    primaryMuted:   "#eff6ff",
    primaryLight:   "#3b82f6",
    primaryDark:    "#1e40af",
    bg:             "#f8fafc",
    surface:        "#ffffff",
    surface2:       "#f1f5f9",
    text:           "#0f172a",
    textSecondary:  "#475569",
    textMuted:      "#94a3b8",
    border:         "#e2e8f0",
    borderStrong:   "#cbd5e1",
    success:        "#059669",
    successBg:      "#ecfdf5",
    warning:        "#d97706",
    warningBg:      "#fffbeb",
    danger:         "#dc2626",
    dangerBg:       "#fef2f2",
    info:           "#7c3aed",
    infoBg:         "#f5f3ff",
    navBg:          "#0f172a",
    navBorder:      "#1e293b",
    navText:        "#94a3b8",
    navTextActive:  "#f8fafc",
    navItemActive:  "#1d4ed8",
    navItemHover:   "#1e293b",
  },

  // Plum — warm alternative
  plum: {
    name: "Plum",
    primary:        "#7e22ce",
    primaryHover:   "#9333ea",
    primaryMuted:   "#faf5ff",
    primaryLight:   "#a855f7",
    primaryDark:    "#6b21a8",
    bg:             "#faf9fb",
    surface:        "#ffffff",
    surface2:       "#f5f3f7",
    text:           "#0f172a",
    textSecondary:  "#475569",
    textMuted:      "#94a3b8",
    border:         "#e2e8f0",
    borderStrong:   "#cbd5e1",
    success:        "#059669",
    successBg:      "#ecfdf5",
    warning:        "#d97706",
    warningBg:      "#fffbeb",
    danger:         "#dc2626",
    dangerBg:       "#fef2f2",
    info:           "#2563eb",
    infoBg:         "#eff6ff",
    navBg:          "#1a0533",
    navBorder:      "#2d1050",
    navText:        "#c4b5fd",
    navTextActive:  "#f8fafc",
    navItemActive:  "#7e22ce",
    navItemHover:   "#2d1050",
  },
};

/** Apply a theme by updating all --cs-* CSS custom properties on :root */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const map: [string, string][] = [
    ["--cs-primary",          theme.primary],
    ["--cs-primary-hover",    theme.primaryHover],
    ["--cs-primary-muted",    theme.primaryMuted],
    ["--cs-primary-light",    theme.primaryLight],
    ["--cs-primary-dark",     theme.primaryDark],
    ["--cs-bg",               theme.bg],
    ["--cs-surface",          theme.surface],
    ["--cs-surface-2",        theme.surface2],
    ["--cs-text",             theme.text],
    ["--cs-text-secondary",   theme.textSecondary],
    ["--cs-text-muted",       theme.textMuted],
    ["--cs-border",           theme.border],
    ["--cs-border-strong",    theme.borderStrong],
    ["--cs-success",          theme.success],
    ["--cs-success-bg",       theme.successBg],
    ["--cs-warning",          theme.warning],
    ["--cs-warning-bg",       theme.warningBg],
    ["--cs-danger",           theme.danger],
    ["--cs-danger-bg",        theme.dangerBg],
    ["--cs-info",             theme.info],
    ["--cs-info-bg",          theme.infoBg],
    ["--cs-nav-bg",           theme.navBg],
    ["--cs-nav-border",       theme.navBorder],
    ["--cs-nav-text",         theme.navText],
    ["--cs-nav-text-active",  theme.navTextActive],
    ["--cs-nav-item-active",  theme.navItemActive],
    ["--cs-nav-item-hover",   theme.navItemHover],
  ];
  map.forEach(([key, value]) => root.style.setProperty(key, value));
}

export const defaultTheme = themes.clinical;
