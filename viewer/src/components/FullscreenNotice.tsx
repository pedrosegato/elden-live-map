import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

interface FullscreenNoticeProps {
  title: string;
  detail?: string;
  translucent?: boolean;
}

export function FullscreenNotice({ title, detail, translucent = false }: FullscreenNoticeProps) {
  return (
    <div
      role="status"
      className={cn(
        "fixed inset-0 z-30 grid animate-in place-items-center p-6 duration-300 fade-in",
        translucent
          ? "bg-[radial-gradient(ellipse_at_center,rgb(20_17_12/0.72)_0%,rgb(8_7_5/0.92)_75%)] backdrop-blur-[5px] backdrop-saturate-70"
          : "bg-[radial-gradient(ellipse_at_50%_40%,var(--color-ink-800)_0%,var(--color-ink-950)_70%)]",
      )}
    >
      <Empty>
        <EmptyHeader>
          <EmptyTitle role="heading" aria-level={1}>
            {title}
          </EmptyTitle>
          <span
            aria-hidden="true"
            className="relative h-[9px] w-[200px] bg-(image:--select-line) bg-size-[100%_1px] bg-center bg-no-repeat after:absolute after:top-1/2 after:left-1/2 after:size-[7px] after:-translate-1/2 after:rotate-45 after:border after:border-gold-300 after:bg-background"
          />
          {detail && <EmptyDescription>{detail}</EmptyDescription>}
        </EmptyHeader>
      </Empty>
    </div>
  );
}
