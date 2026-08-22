// packages/shared/src/lib/utils.ts — shadcn/ui's class merger.
//
// clsx resolves conditionals; twMerge then resolves CONFLICTS, so a caller passing `p-6` to a
// component whose base is `p-4` gets p-6 rather than both classes fighting in source order. Every
// shadcn component takes a className for exactly this reason, and it only works because of this
// function.
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
