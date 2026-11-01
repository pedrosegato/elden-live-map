import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { LngLat } from "../lib/types";
import { useMapState } from "./MapContext";
import { maplibregl } from "./maplibre";

const MARKER_CLEARANCE = 24;

interface MapPopupProps {
  lngLat: LngLat;
  onClose: () => void;
  children: ReactNode;
}

export function MapPopup({ lngLat, onClose, children }: MapPopupProps) {
  const { map } = useMapState();
  const [container] = useState(() => document.createElement("div"));
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const popup = new maplibregl.Popup({
      maxWidth: "400px",
      anchor: "top",
      offset: MARKER_CLEARANCE,
      focusAfterOpen: false,
      closeButton: false,
      className: "location-popup",
    })
      .setLngLat(lngLat)
      .setDOMContent(container)
      .addTo(map);
    const close = () => closeRef.current();
    popup.on("close", close);
    return () => {
      popup.off("close", close);
      popup.remove();
    };
  }, [map, container, lngLat]);

  return createPortal(children, container);
}
