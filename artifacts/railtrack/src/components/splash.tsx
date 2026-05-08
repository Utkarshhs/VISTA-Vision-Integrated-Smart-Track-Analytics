import { useEffect, useState } from "react";

interface SplashProps {
  onDone: () => void;
}

export function Splash({ onDone }: SplashProps) {
  const [phase, setPhase] = useState<"letters" | "expand" | "subtitle" | "fade">("letters");
  const letters = ["V", "I", "S", "T", "A"];
  const [visibleLetters, setVisibleLetters] = useState<boolean[]>([false, false, false, false, false]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    letters.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setVisibleLetters(prev => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, 300 + i * 180));
    });

    timers.push(setTimeout(() => setPhase("expand"), 300 + letters.length * 180 + 200));
    timers.push(setTimeout(() => setPhase("subtitle"), 300 + letters.length * 180 + 700));
    timers.push(setTimeout(() => setPhase("fade"), 300 + letters.length * 180 + 2200));
    timers.push(setTimeout(() => onDone(), 300 + letters.length * 180 + 2900));

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
      style={{
        opacity: phase === "fade" ? 0 : 1,
        transition: phase === "fade" ? "opacity 0.7s ease-out" : "none",
      }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,_rgba(139,92,246,0.15),_transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_50%_50%,_rgba(139,92,246,0.08),_transparent)]" />
      </div>

      <div className="flex items-center gap-1 md:gap-3 mb-6 relative">
        {letters.map((letter, i) => (
          <span
            key={i}
            className="font-display font-black text-7xl md:text-9xl tracking-widest select-none"
            style={{
              color: "hsl(270 80% 65%)",
              textShadow: visibleLetters[i]
                ? "0 0 40px hsl(270 80% 65% / 0.8), 0 0 80px hsl(270 80% 65% / 0.4)"
                : "none",
              opacity: visibleLetters[i] ? 1 : 0,
              transform: visibleLetters[i] ? "translateY(0) scale(1)" : "translateY(30px) scale(0.8)",
              transition: "opacity 0.4s ease-out, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), text-shadow 0.4s ease-out",
            }}
          >
            {letter}
          </span>
        ))}

        {phase !== "letters" && (
          <div
            className="absolute -bottom-2 left-0 right-0 h-px"
            style={{
              background: "linear-gradient(90deg, transparent, hsl(270 80% 65%), transparent)",
              boxShadow: "0 0 12px hsl(270 80% 65% / 0.8)",
              animation: "expandLine 0.5s ease-out forwards",
            }}
          />
        )}
      </div>

      <div
        style={{
          opacity: phase === "subtitle" || phase === "fade" ? 1 : 0,
          transform: phase === "subtitle" || phase === "fade" ? "translateY(0)" : "translateY(10px)",
          transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
        }}
        className="text-center"
      >
        <p className="text-muted-foreground font-mono text-sm md:text-base tracking-[0.25em] uppercase">
          Vision-Integrated Smart Track Analytics
        </p>
        <p className="mt-3 text-xs text-muted-foreground/50 tracking-widest font-mono">
          Initialising systems...
        </p>
      </div>

      <style>{`
        @keyframes expandLine {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}
