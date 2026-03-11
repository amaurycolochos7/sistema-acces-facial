import type { Metadata } from "next";
import "./globals.css";
import SWRegister from "@/components/SWRegister";

export const metadata: Metadata = {
  title: "TecNM VC - Control de Acceso",
  description: "Sistema de Control de Acceso por Reconocimiento Facial — Tecnológico Nacional de México, Extensión Venustiano Carranza",
  manifest: "/manifest.json",
  themeColor: "#1B2A4A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
        <SWRegister />
      </body>
    </html>
  );
}
