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
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Z.ai Code Scaffold",
    description: "AI-powered development with modern React stack",
    url: "https://chat.z.ai",
    siteName: "Z.ai",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Z.ai Code Scaffold",
    description: "AI-powered development with modern React stack",
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
