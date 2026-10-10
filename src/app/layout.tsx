import localFont from "next/font/local";
import Brand from "./components/Brand";
import type { Metadata } from "next";

import Link from "next/link";
import Sidebar from "./components/Sidebar";
import "./globals.css";

const geistSans = localFont({
  src: "../../public/brand/geist-latin.woff2",
  variable: "--font-geist-sans",
  display: "swap",
});
export const metadata: Metadata = {
  title: "Censo Hospitalario · HEGB",
  description: "Censo del Hospital Regional Eleazar Guzmán Barrón",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
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
                <Brand />
              </Link>
            </header>

            <a className="skip-link" href="#contenido">
              Ir al contenido
            </a>
            <main id="contenido" className="app-main">
              {children}
            </main>

            <footer className="app-footer">
              <div className="app-footer-inner">
                <span>Censo Hospitalario</span>
                <span>Hospital Regional Eleazar Guzmán Barrón</span>
              </div>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
