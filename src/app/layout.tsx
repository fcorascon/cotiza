import type { Metadata } from "next";

import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import {
  ConfiguracionAplicacionProvider,
} from "@/components/configuracion-aplicacion";

const geistSans = { variable: "--font-geist-sans" };

const geistMono = { variable: "--font-geist-mono" };

export const metadata: Metadata = {
  title: "Administrador de Presupuestos",
  description:
    "Aplicación para administrar presupuestos: registro y administración de clientes, datos fiscales y de contacto.",
  keywords: ["presupuestos", "clientes", "administración", "gestión"],
  icons: {
    icon: "/logotipo.png",
    shortcut: "/logotipo.png",
    apple: "/logotipo.png",
  },
  openGraph: {
    title: "Administrador de Presupuestos — Comercializadora SunCatcher del Norte",
    description:
      "Aplicación para administrar presupuestos: registro y administración de clientes, datos fiscales y de contacto.",
    siteName: "Administrador de Presupuestos",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Administrador de Presupuestos — Comercializadora SunCatcher del Norte",
    description:
      "Aplicación para administrar presupuestos: registro y administración de clientes, datos fiscales y de contacto.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ConfiguracionAplicacionProvider>
          {children}
          <Toaster />
        </ConfiguracionAplicacionProvider>
      </body>
    </html>
  );
}
