import { FullscreenNotice } from "./components/FullscreenNotice";
import { useDataset } from "./hooks/useDataset";
import { usePreferences } from "./hooks/usePreferences";
import { t } from "./lib/copy";
import { MapScreen } from "./MapScreen";

export function App() {
  const dataset = useDataset();
  const { preferences, update, setCategoriesHidden } = usePreferences();

  if (dataset.status === "loading") return <FullscreenNotice title={t("loadingTitle")} />;
  if (dataset.status === "error") return <FullscreenNotice title={t("errorTitle")} detail={t("errorDetail")} />;
  return (
    <MapScreen
      dataset={dataset.dataset}
      preferences={preferences}
      onPreferencesChange={update}
      onCategoriesHidden={setCategoriesHidden}
    />
  );
}
