"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const KEY = "cdv-age-ok";
const EVENT = "cdv-age-change";

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Portão de idade 18+. A confirmação fica no localStorage, então só aparece
 * uma vez por navegador.
 *
 * O valor é lido via `useSyncExternalStore` para evitar setState dentro de
 * efeito. No servidor o snapshot é "liberado", de modo que o HTML nunca
 * contém o modal e ele aparece já na hidratação — sem flash de conteúdo.
 */
export function AgeGate({ storeName, notice }: { storeName: string; notice?: string | null }) {
  const allowed = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(KEY) === "1",
    () => true,
  );
  const [denied, setDenied] = useState(false);

  const allow = useCallback(() => {
    localStorage.setItem(KEY, "1");
    window.dispatchEvent(new Event(EVENT));
  }, []);

  if (allowed) return null;

  return (
    <div className="fixed inset-0 z-100 grid place-items-center bg-ink-950/90 p-4 backdrop-blur-md">
      <div className="surface w-full max-w-md p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500">
          <Zap size={22} className="text-white" fill="currentColor" />
        </span>

        {denied ? (
          <>
            <h2 className="mt-5 text-2xl font-black text-white">Acesso não permitido</h2>
            <p className="mt-2 text-sm text-white/55">
              Este site vende produtos com nicotina e é restrito a maiores de 18 anos.
            </p>
            <Button variant="ghost" className="mt-6 w-full" onClick={() => setDenied(false)}>
              Voltar
            </Button>
          </>
        ) : (
          <>
            <h2 className="mt-5 text-2xl font-black text-white">Você tem 18 anos ou mais?</h2>
            <p className="mt-2 text-sm text-white/55">
              O conteúdo de {storeName} é destinado apenas a maiores de idade.
            </p>
            <div className="mt-7 space-y-2">
              <Button className="w-full" size="lg" onClick={allow}>
                Sim, sou maior de 18
              </Button>
              <Button variant="outline" className="w-full" size="lg" onClick={() => setDenied(true)}>
                Não
              </Button>
            </div>
          </>
        )}

        {notice && <p className="mt-6 text-xs leading-relaxed text-white/35">{notice}</p>}
      </div>
    </div>
  );
}
