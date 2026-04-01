import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/layout/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CareSync — Patient Intelligence Platform",
  description: "FHIR R4 · HL7v2 · AI-powered clinical reasoning",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="h-full antialiased">
        <Providers>
          <div className="flex h-full">
            <Sidebar />
            {/* Main content — offset by sidebar width */}
            <div className="flex-1 flex flex-col min-w-0 ml-60" style={{ backgroundColor: "var(--cs-bg)" }}>
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
