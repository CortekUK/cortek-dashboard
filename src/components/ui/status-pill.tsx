import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { TONE_CLASSES, type StatusTone } from "@/lib/status-colors"

const pillVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border text-[11px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2",
  {
    variants: {
      size: {
        sm: "h-5 px-2 text-[10px]",
        md: "h-6 px-2.5",
        lg: "h-7 px-3 text-xs",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

type StatusPillProps = useRender.ComponentProps<"span"> &
  VariantProps<typeof pillVariants> & {
    tone: StatusTone
    /** "soft" = tinted background + colored text (default). "solid" = strong bg + light text. */
    variant?: "soft" | "solid"
    /** Show a small colored dot at the start of the pill. */
    dot?: boolean
    /** Render a glow ring around the pill. Subtle. */
    glow?: boolean
  }

function StatusPill({
  className,
  tone,
  variant = "soft",
  size = "md",
  dot = false,
  glow = false,
  render,
  children,
  ...props
}: StatusPillProps) {
  const toneClasses = TONE_CLASSES[tone]
  const palette = variant === "solid" ? toneClasses.solid : toneClasses.soft

  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(
          pillVariants({ size }),
          palette,
          glow && `shadow-[0_0_0_3px_var(--tw-ring-color)] ${toneClasses.ring}`,
          className
        ),
        children: (
          <>
            {dot && (
              <span
                aria-hidden
                className={cn(
                  "size-1.5 rounded-full",
                  variant === "solid"
                    ? "bg-current/80"
                    : toneClasses.dot
                )}
              />
            )}
            {children}
          </>
        ),
      },
      props
    ),
    render,
    state: { tone, variant },
  })
}

export { StatusPill }
