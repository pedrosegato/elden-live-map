import type { ReactNode } from "react";

interface FrameProps {
  label: string;
  width: number;
  height?: number;
  backdrop?: "map" | "ink";
  children: ReactNode;
}

export function Frame({ label, width, height, backdrop = "ink", children }: FrameProps) {
  return (
    <figure className="m-0 flex flex-col gap-2">
      <figcaption className="text-[0.92rem] text-bone-400">{label}</figcaption>
      <div
        data-backdrop={backdrop}
        style={{ width, height }}
        className="relative transform-[translateZ(0)] overflow-hidden border border-hairline bg-background data-[backdrop=map]:bg-[radial-gradient(circle_at_30%_30%,rgb(255_255_255/0.08),transparent_60%),linear-gradient(135deg,#5e5a49,#8d8670_55%,#6b6653)]"
      >
        {children}
      </div>
    </figure>
  );
}
