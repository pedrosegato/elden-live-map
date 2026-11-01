import { CaretLeftIcon, CaretRightIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { t } from "@/lib/copy";

export interface LightboxImage {
  src: string;
  alt: string;
}

interface LightboxProps {
  images: LightboxImage[];
  startIndex: number;
  onClose: () => void;
}

export function Lightbox({ images, startIndex, onClose }: LightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const current = images[index];
  const hasSiblings = images.length > 1;
  const step = (offset: number) => setIndex((value) => (value + offset + images.length) % images.length);

  useEffect(() => {
    if (!hasSiblings) return;
    for (const offset of [1, -1]) {
      const neighbor = images[(index + offset + images.length) % images.length];
      if (neighbor) new Image().src = neighbor.src;
    }
  }, [images, index, hasSiblings]);

  if (!current) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="inset-0 top-0 left-0 grid h-dvh w-screen max-w-none translate-x-0 translate-y-0 place-items-center rounded-none bg-transparent p-0 ring-0 sm:max-w-none"
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") step(-1);
          if (event.key === "ArrowRight") step(1);
        }}
      >
        <figure className="m-0 grid justify-items-center gap-3 px-[72px] pt-16 pb-6 max-md:px-3">
          <img
            className="max-h-[calc(100dvh-120px)] max-w-[calc(100vw-160px)] border object-contain shadow-[0_24px_60px_rgb(0_0_0/0.7)] max-md:max-w-[calc(100vw-24px)]"
            src={current.src}
            alt={current.alt}
          />
          <figcaption className="flex items-baseline gap-3.5">
            <DialogTitle className="font-display text-[0.78rem] font-semibold tracking-[0.14em] text-bone-300 uppercase">
              {current.alt}
            </DialogTitle>
            {hasSiblings && (
              <span className="text-[0.92rem] text-bone-500 tabular-nums">
                {t("photoCount", { index: index + 1, total: images.length })}
              </span>
            )}
          </figcaption>
        </figure>
        {hasSiblings && (
          <>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label={t("previousPhoto")}
              className="fixed top-1/2 left-4 -translate-y-1/2 max-md:top-auto max-md:bottom-5 max-md:translate-y-0"
              onClick={() => step(-1)}
            >
              <CaretLeftIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label={t("nextPhoto")}
              className="fixed top-1/2 right-4 -translate-y-1/2 max-md:top-auto max-md:bottom-5 max-md:translate-y-0"
              onClick={() => step(1)}
            >
              <CaretRightIcon />
            </Button>
          </>
        )}
        <DialogClose
          render={
            <Button variant="ghost" size="icon-lg" aria-label={t("closePhoto")} className="fixed top-4 right-4" />
          }
        >
          <XIcon />
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
