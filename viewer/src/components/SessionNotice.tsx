import type { CopyKey } from "@/lib/copy";
import { t } from "@/lib/copy";
import type { ConnectionStatus } from "@/lib/types";
import { FullscreenNotice } from "./FullscreenNotice";

const TITLES: Record<ConnectionStatus, CopyKey> = {
  connecting: "connectingTitle",
  offline: "offlineTitle",
  online: "menuTitle",
};

interface SessionNoticeProps {
  connection: ConnectionStatus;
}

export function SessionNotice({ connection }: SessionNoticeProps) {
  return <FullscreenNotice translucent title={t(TITLES[connection])} />;
}
