// Catálogo modular de la Etapa 3B.
// Cada pieza vive en su propio JSON: para añadir una melodía basta con crear
// `src/data/melodies/<id>.json`. Este archivo las descubre y las ordena.
import type { Melody } from "../../lib/melodies";

interface MelodyFile extends Melody {
  /** Posición en la biblioteca; si falta, se ordena por id. */
  order?: number;
}

const files = import.meta.glob("./*.json", { eager: true });

export const melodies: Melody[] = Object.values(files)
  .map((module) => (module as { default: MelodyFile }).default)
  .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) || a.id.localeCompare(b.id))
  .map(({ order: _order, ...melody }) => melody);

export const MELODY_CATALOG_VERSION = 1;
