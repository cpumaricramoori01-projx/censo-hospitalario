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
