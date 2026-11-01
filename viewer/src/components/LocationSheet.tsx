import type { ReactNode } from "react";

interface LocationSheetProps {
  children: ReactNode;
}

export function LocationSheet({ children }: LocationSheetProps) {
  return (
    <section className="fixed inset-x-0 bottom-0 z-8 grid max-h-[72dvh] animate-in border-t bg-background pb-[env(safe-area-inset-bottom)] shadow-[0_-18px_40px_rgb(0_0_0/0.6)] duration-300 ease-out-expo fade-in slide-in-from-bottom-10 *:max-h-[inherit]">
      {children}
    </section>
  );
}
