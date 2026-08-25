import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Miniatura do produto. Sem imagem cadastrada, cai num placeholder com a
 * inicial do produto — a loja continua apresentável antes das fotos entrarem.
 */
export function ProductThumb({
  src,
  alt,
  name,
  className,
  sizes = "(max-width: 768px) 50vw, 25vw",
  priority,
}: {
  src?: string | null;
  alt?: string | null;
  name: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-gradient-to-br from-ink-800 to-ink-700",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt ?? name}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <span className="bg-gradient-to-br from-brand-200 to-accent-400 bg-clip-text text-5xl font-black text-transparent">
            {name.slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}
