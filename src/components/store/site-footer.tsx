import Link from "next/link";
import { AtSign, Mail, MapPin, MessageCircle, Zap } from "lucide-react";
import { whatsappLink } from "@/lib/utils";
import type { Settings } from "@/lib/settings";

export function SiteFooter({
  settings,
  categories,
}: {
  settings: Settings;
  categories: { name: string; slug: string }[];
}) {
  return (
    <footer className="relative z-10 mt-20 border-t border-white/8 bg-ink-900/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500">
              <Zap size={18} className="text-white" fill="currentColor" />
            </span>
            <span className="text-lg font-black text-white">{settings.storeName}</span>
          </div>
          {settings.tagline && <p className="mt-3 text-sm text-white/50">{settings.tagline}</p>}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Categorias</h3>
          <ul className="mt-3 space-y-2 text-sm text-white/50">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/produtos?categoria=${c.slug}`} className="hover:text-white">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Atendimento</h3>
          <ul className="mt-3 space-y-2 text-sm text-white/50">
            <li>
              <a
                href={whatsappLink(settings.whatsapp, "Olá! Vim pelo site.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:text-white"
              >
                <MessageCircle size={15} /> WhatsApp
              </a>
            </li>
            {settings.instagram && (
              <li>
                <a
                  href={`https://instagram.com/${settings.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-white"
                >
                  <AtSign size={15} /> @{settings.instagram.replace("@", "")}
                </a>
              </li>
            )}
            {settings.email && (
              <li className="inline-flex items-center gap-2">
                <Mail size={15} /> {settings.email}
              </li>
            )}
            {settings.address && (
              <li className="inline-flex items-center gap-2">
                <MapPin size={15} /> {settings.address}
              </li>
            )}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Pagamento</h3>
          <p className="mt-3 text-sm text-white/50">
            Pix, dinheiro ou cartão na entrega. O pedido é confirmado pelo WhatsApp.
          </p>
          <p className="mt-3 text-sm text-accent-300">Frete grátis em todos os pedidos</p>
        </div>
      </div>

      <div className="border-t border-white/8 px-4 py-6">
        <div className="mx-auto max-w-7xl space-y-2 text-center text-xs text-white/35">
          {settings.legalNotice && <p className="text-amber-300/70">{settings.legalNotice}</p>}
          <p>
            © {new Date().getFullYear()} {settings.storeName}. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
