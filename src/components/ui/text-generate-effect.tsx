import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function TextGenerateEffect({
                                     words,
                                     className,
                                     filter = true,
                                     staggerDelay = 0.12,
                                     blurStart = 14,
                                   }: {
  words: string;
  className?: string;
  filter?: boolean;
  staggerDelay?: number;
  blurStart?: number;
}) {
  const wordsArray = words.split(" ");

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: staggerDelay } },
  } as const;

  const child = {
    hidden: {
      "--blur": `${blurStart}px`,
      "--o": 0,
      "--y": "8px",
      "--s": 0.98,
    },
    show: {
      "--blur": "0px",
      "--o": 1,
      "--y": "0px",
      "--s": 1,
      transition: {
        duration: 0.45,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  } as const;

  return (
    <div className={cn("font-bold", className)}>
      <div className="mt-4 dark:text-white text-black text-2xl leading-snug tracking-wide text-center">
        <motion.div variants={container} initial="hidden" animate="show">
          {wordsArray.map((word, idx) => (
            <motion.span
              key={`${word}-${idx}`}
              variants={child}
              className="inline-block whitespace-pre"
              style={{
                opacity: "var(--o)" as any,
                transform:
                  "translateY(var(--y)) scale(var(--s))" as any,
                filter: filter ? "blur(var(--blur))" : "none",
                willChange: "transform, opacity, filter",
              }}
            >
              {word + " "}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
