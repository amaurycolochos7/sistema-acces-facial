import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TecNM VC - Control de Acceso",
  description: "Sistema de Control de Acceso por Reconocimiento Facial — Tecnológico Nacional de México, Extensión Venustiano Carranza",
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
      </body>
    </html>
  );
}
