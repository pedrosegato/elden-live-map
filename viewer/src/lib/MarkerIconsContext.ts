import { createContext } from "react";
import type { MarkerIcons } from "./types";

export const MarkerIconsContext = createContext<MarkerIcons | null>(null);
