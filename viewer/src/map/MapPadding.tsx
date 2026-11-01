import { useEffect } from "react";
import { useMapState } from "./MapContext";

const PANEL_SLIDE_MS = 280;

interface MapPaddingProps {
  left: boolean;
}

export function MapPadding({ left }: MapPaddingProps) {
  const { map } = useMapState();

  useEffect(() => {
    const width = left
      ? Number.parseFloat(getComputedStyle(map.getContainer()).getPropertyValue("--sidebar-width"))
      : 0;
    map.easeTo({ padding: { top: 0, right: 0, bottom: 0, left: width }, duration: PANEL_SLIDE_MS });
  }, [map, left]);

  return null;
}
