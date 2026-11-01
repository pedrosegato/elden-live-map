import { useEffect, useState } from "react";
import { loadDataset } from "../lib/dataset";
import type { Dataset } from "../lib/types";

export type DatasetState = { status: "loading" } | { status: "error" } | { status: "ready"; dataset: Dataset };

export function useDataset(): DatasetState {
  const [state, setState] = useState<DatasetState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    loadDataset()
      .then((dataset) => active && setState({ status: "ready", dataset }))
      .catch(() => active && setState({ status: "error" }));
    return () => {
      active = false;
    };
  }, []);

  return state;
}
