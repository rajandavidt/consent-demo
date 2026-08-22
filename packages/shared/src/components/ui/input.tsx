import * as React from "react"

import { cn } from "../../lib/utils.js"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // The registry's transition list is `[color,box-shadow]`, which leaves out the one property
        // an input actually changes most: its border. So the ring faded in smoothly while the border
        // underneath it snapped from grey to violet — two halves of one effect arriving at different
        // times, which is the kind of thing you feel without being able to name. `border-color` and
        // `background-color` added, and pinned to --duration-fast: this is a control the user is
        // touching, and a border that takes 200ms to acknowledge a click feels unresponsive.
        "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow,border-color,background-color] duration-[var(--duration-fast)] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground md:text-sm dark:bg-input/30",
        // Hover on an enabled field only. A text input that does not react to the pointer is
        // indistinguishable from a read-only value rendered in a box, which is a real ambiguity on
        // these screens — several of them show exactly that (a masked account number in a bordered
        // strip) right next to fields you can type in.
        "enabled:hover:border-ring/40",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        // A DISABLED FIELD MUST LOOK DISABLED, and `opacity-50` on a transparent-background input
        // only fades the border and the placeholder — the field keeps its white fill and still reads
        // as somewhere you could click and type. Filling it with `muted` is what says "not yours to
        // edit"; the cursor and pointer-events are the stock behaviour and stay.
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-muted disabled:shadow-none",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
