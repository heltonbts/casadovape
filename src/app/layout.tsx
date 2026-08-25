import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const sans = Geist({ variable: "--font-sans-custom", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Casa do Vape — Pods, vapes e e-liquids",
    template: "%s · Casa do Vape",
  },
  description:
    "Pods descartáveis, vapes recarregáveis, juices e acessórios com entrega rápida. Venda proibida para menores de 18 anos.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${sans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: { background: "#181128", border: "1px solid rgba(255,255,255,.1)", color: "#fff" },
          }}
        />
      </body>
    </html>
  );
}
