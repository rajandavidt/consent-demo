import * as React from "react"
import { CheckIcon } from "lucide-react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import { cn } from "../../lib/utils.js"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        // `transition-shadow` was the registry's choice and it animates the one thing this control
        // does not change: the box goes from a grey outline to a solid violet fill, which is a
        // background and a border, neither of which was in the list. So the most important state
        // change in a consent form — "have I agreed to this or not" — snapped while the focus ring
        // it sits inside faded. `press` on top, because a 16px checkbox is the smallest target on
        // these screens and the one where you most want confirmation that the click was yours.
        "press peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:data-[state=checked]:bg-primary",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        // Radix mounts and unmounts this node with the checked state, so there is no "before" to
        // transition from — an entrance keyframe is the only thing that can work here, which is why
        // the registry gives up and says `transition-none`. The tick scales up from 60% over
        // --duration-fast: enough to feel like the tick landed, short enough that it is finished
        // before someone ticking a run of consent boxes reaches the next one.
        // The tick scales up from 50%: enough to feel like it landed, short enough to be finished
        // before someone ticking a run of consent boxes reaches the next one. Unconditional
        // `animate-in` rather than a `data-[state=checked]:` variant because Radix only mounts this
        // node when the box is checked — the state selector would be true every time it exists.
        className="grid place-content-center text-current animate-in zoom-in-50 duration-[var(--duration-fast)] ease-[var(--ease-out-quart)]"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
