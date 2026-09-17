import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Sidebar from "./components/Sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Censo Hospitalario",
  description: "Sistema de gestión y registro hospitalario",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>
        <style>{`
          @media print {
            body:has(.reportes-print) .app-shell,
            body:has(.reportes-print) .app-content,
            body:has(.reportes-print) .app-main {
              min-height: 0 !important;
              height: auto !important;
            }
            body:has(.reportes-print) .app-sidebar,
            body:has(.reportes-print) .app-mobile-header,
            body:has(.reportes-print) .app-footer {
              display: none !important;
            }
            body:has(.reportes-print) .app-shell {
              display: block !important;
            }
            body:has(.reportes-print) .app-content {
              width: 100% !important;
              display: block !important;
            }
            body:has(.reportes-print) .app-main {
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
              padding: 0 !important;
            }
          }
        `}</style>

        <div className="app-shell">
          <Sidebar />

          <div className="app-content">
            <header className="app-mobile-header">
              <Link href="/panel" className="app-mobile-brand">
                <div className="app-mobile-brand-icon">+</div>

                <div>
                  <span className="app-mobile-brand-title">
                    Censo Hospitalario
                  </span>
                  <span className="app-mobile-brand-subtitle">
                    Sistema de gestión
                  </span>
                </div>
              </Link>
            </header>

            <main className="app-main">{children}</main>

            <footer className="app-footer">
              <div className="app-footer-inner">
                <span>Censo Hospitalario</span>
                <span>Sistema de gestión hospitalaria</span>
              </div>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
