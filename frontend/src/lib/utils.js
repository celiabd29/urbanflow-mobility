import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Fusionne des classes Tailwind en gérant les conflits (ex: px-2 + px-4 -> px-4).
// clsx gère les conditions, twMerge dédoublonne intelligemment.
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
