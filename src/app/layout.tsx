import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
          <header className="app-header">
            <div className="app-header-inner">
              <Link href="/" className="app-brand">
                <div className="app-brand-icon">+</div>

                <div className="app-brand-text">
                  <span className="app-brand-title">
                    Censo Hospitalario
                  </span>
                  <span className="app-brand-subtitle">
                    Sistema de gestión hospitalaria
                  </span>
                </div>
              </Link>

              <div className="app-header-badge">
                Gestión hospitalaria
              </div>
            </div>
          </header>

          <main className="app-main">{children}</main>

          <footer className="app-footer">
            <div className="app-footer-inner">
              <span>Censo Hospitalario</span>
              <span>Sistema de gestión hospitalaria</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}