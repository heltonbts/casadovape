import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const sans = Geist({ variable: "--font-sans-custom", subsets: ["latin"] });

/** Sem isso o Next resolve a imagem de open graph contra localhost e o preview
 *  do link quebra no WhatsApp. Na Vercel a URL de produção vem do ambiente. */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
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
