import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PositionListener } from "../hooks/useGameSession";
import { locateOnMap } from "../lib/coordinates";
import { approach, approachAngle, isTeleport, smoothingFactor, type TrackedSample } from "../lib/smoothing";
import type { Calibration } from "../lib/types";
import { useMapState } from "./MapContext";
import { maplibregl } from "./maplibre";
import { iconScaleAt, OVERZOOM_LEVELS } from "./mapStyle";
import { PlayerNeedle } from "./PlayerNeedle";

const TIME_CONSTANT_MS = 70;
const SETTLED_DEGREES = 1e-7;
const MAX_PLAYER_SPEED_MPS = 60;

interface Pose {
  lng: number;
  lat: number;
  bearing: number;
}

interface PlayerMarkerProps {
  calibration: Calibration | null;
  activeMapId: string;
  following: boolean;
  subscribePosition: (listener: PositionListener) => () => void;
  onFollowingChange: (following: boolean) => void;
  onPlayerMapChange: (mapId: string) => void;
}

export function PlayerMarker({
  calibration,
  activeMapId,
  following,
  subscribePosition,
  onFollowingChange,
  onPlayerMapChange,
}: PlayerMarkerProps) {
  const { map } = useMapState();
  const [element] = useState(() => document.createElement("div"));
  const headingRef = useRef<HTMLDivElement>(null);
  const poseRef = useRef<Pose | null>(null);
  const live = useRef({ activeMapId, following, onFollowingChange, onPlayerMapChange });

  useEffect(() => {
    live.current = { activeMapId, following, onFollowingChange, onPlayerMapChange };
  });

  useEffect(() => {
    const pose = poseRef.current;
    if (following && pose) map.jumpTo({ center: [pose.lng, pose.lat] });
  }, [map, following]);

  useEffect(() => {
    const marker = new maplibregl.Marker({ element });
    let target: Pose | null = null;
    let attached = false;
    let frame = 0;
    let lastFrameTime = 0;
    let lastSample: TrackedSample | null = null;

    const render = (pose: Pose) => {
      marker.setLngLat([pose.lng, pose.lat]);
      headingRef.current?.style.setProperty("transform", `rotate(${pose.bearing}deg)`);
      if (live.current.following) map.jumpTo({ center: [pose.lng, pose.lat] });
    };

    const hide = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      marker.remove();
      attached = false;
      poseRef.current = null;
    };

    const tick = (now: number) => {
      const pose = poseRef.current;
      if (!pose || !target) return;
      const factor = smoothingFactor(now - lastFrameTime, TIME_CONSTANT_MS);
      lastFrameTime = now;
      const next = {
        lng: approach(pose.lng, target.lng, factor),
        lat: approach(pose.lat, target.lat, factor),
        bearing: approachAngle(pose.bearing, target.bearing, factor),
      };
      poseRef.current = next;
      render(next);
      const settled =
        Math.abs(target.lng - next.lng) < SETTLED_DEGREES && Math.abs(target.lat - next.lat) < SETTLED_DEGREES;
      frame = settled ? 0 : requestAnimationFrame(tick);
    };

    const unsubscribe = subscribePosition((sample) => {
      const located = locateOnMap(calibration, sample);
      if (!located) {
        lastSample = null;
        hide();
        return;
      }
      const tracked = { t: sample.t, mapId: located.mapId, world: located.world };
      const snap = isTeleport(lastSample, tracked, MAX_PLAYER_SPEED_MPS);
      lastSample = tracked;

      if (located.mapId !== live.current.activeMapId) {
        hide();
        if (live.current.following) live.current.onPlayerMapChange(located.mapId);
        return;
      }

      target = { lng: located.lngLat[0], lat: located.lngLat[1], bearing: located.bearing };
      if (!attached) {
        marker.setLngLat(located.lngLat).addTo(map);
        attached = true;
      }
      if (snap || !poseRef.current) {
        cancelAnimationFrame(frame);
        frame = 0;
        poseRef.current = { ...target };
        render(target);
        return;
      }
      if (!frame) {
        lastFrameTime = performance.now();
        frame = requestAnimationFrame(tick);
      }
    });

    const stopFollowing = () => live.current.onFollowingChange(false);
    const scaleWithZoom = () => {
      const scale = iconScaleAt(map.getZoom(), map.getMinZoom(), map.getMaxZoom() - OVERZOOM_LEVELS);
      element.style.setProperty("--player-scale", String(scale));
    };
    scaleWithZoom();
    map.on("dragstart", stopFollowing);
    map.on("zoom", scaleWithZoom);

    return () => {
      unsubscribe();
      map.off("dragstart", stopFollowing);
      map.off("zoom", scaleWithZoom);
      hide();
    };
  }, [map, element, calibration, subscribePosition]);

  return createPortal(<PlayerNeedle headingRef={headingRef} />, element);
}
