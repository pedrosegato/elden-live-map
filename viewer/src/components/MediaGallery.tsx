import { useState } from "react";
import { t } from "@/lib/copy";
import { dataUrl } from "@/lib/dataset";
import type { Media } from "@/lib/types";
import { Lightbox, type LightboxImage } from "./Lightbox";

interface MediaGalleryProps {
  media: Media[];
  title: string;
}

export function MediaGallery({ media, title }: MediaGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const images = media.flatMap((item) =>
    item.type === "image" ? [{ src: dataUrl(item.src), thumb: dataUrl(item.thumb ?? item.src), alt: title }] : [],
  );
  const videos = media.flatMap((item) => (item.type === "video" ? [item.url] : []));
  const lightboxImages: LightboxImage[] = images.map(({ src, alt }) => ({ src, alt }));

  if (images.length === 0 && videos.length === 0) return null;

  return (
    <div data-odd={images.length % 2 === 1} className="group/gallery grid grid-cols-2 gap-1.5">
      {images.map((image, index) => (
        <button
          key={image.src}
          type="button"
          className="group/thumb relative block cursor-zoom-in overflow-hidden rounded-md border border-hairline bg-ink-950 p-0 outline-none transition-colors hover:border-gold-400 focus-visible:border-gold-400 group-data-[odd=true]/gallery:first:col-span-2"
          aria-label={t("enlargePhoto", { index: index + 1 })}
          onClick={() => setOpenIndex(index)}
        >
          <img
            className="block aspect-video w-full object-cover transition-transform duration-400 ease-out-expo group-hover/thumb:scale-[1.03]"
            src={image.thumb}
            alt=""
            loading="lazy"
            decoding="async"
          />
        </button>
      ))}
      {videos.map((url) => (
        <a
          key={url}
          className="col-span-2 text-[0.95rem] text-gold-300 underline decoration-gold-300/45 underline-offset-3"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("video")}
        </a>
      ))}
      {openIndex !== null && (
        <Lightbox images={lightboxImages} startIndex={openIndex} onClose={() => setOpenIndex(null)} />
      )}
    </div>
  );
}
