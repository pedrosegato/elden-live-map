import type { Profile } from "../lib/types";

const GAME_TITLE = "Elden Ring";

interface SessionTitleProps {
  profile: Profile | null;
}

export function SessionTitle({ profile }: SessionTitleProps) {
  return <title>{profile ? `${GAME_TITLE} - ${profile.characterName}` : GAME_TITLE}</title>;
}
