import { useDataset } from "@/hooks/useDataset";
import { MarkerIconsContext } from "@/lib/MarkerIconsContext";
import { GallerySheet } from "./GallerySheet";

export function Gallery() {
  const dataset = useDataset();
  if (dataset.status !== "ready") {
    return (
      <p className="p-10 text-bone-400">{dataset.status === "loading" ? "Loading dataset…" : "No dataset found."}</p>
    );
  }
  return (
    <MarkerIconsContext value={dataset.dataset.icons}>
      <GallerySheet dataset={dataset.dataset} />
    </MarkerIconsContext>
  );
}
