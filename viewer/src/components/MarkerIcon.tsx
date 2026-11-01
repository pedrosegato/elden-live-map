import { use } from "react";
import { MarkerIconsContext } from "@/lib/MarkerIconsContext";

interface MarkerIconProps {
  id: string;
  box: number;
}

export function MarkerIcon({ id, box }: MarkerIconProps) {
  const src = use(MarkerIconsContext)?.url(id);
  if (!src) return <span className="block flex-none" style={{ width: box, height: box }} />;
  return <img className="block flex-none object-contain" style={{ width: box, height: box }} src={src} alt="" />;
}
