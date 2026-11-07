export function $<T extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T | null {
  return root.querySelector<T>(selector);
}

export function $$<T extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

export function must<T>(value: T | null | undefined, label: string): T {
  if (value == null) {
    throw new Error(`Elemento no encontrado: ${label}`);
  }
  return value;
}
