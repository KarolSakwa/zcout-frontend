"use client";

import { useEffect, useState } from "react";
import TopRisersWidget, {
  type TopRiserItem,
} from "@/components/duels/TopRisersWidget";
import { fetchTopMoversSummary } from "@/components/duels/useDuelSideWidgets";
import { useHomepageSectionLoading } from "@/components/homepage/HomepageLoadingContext";

export default function TopRisersSection() {
  const [items, setItems] = useState<TopRiserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useHomepageSectionLoading("topRisers", isLoading);

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    async function loadTopRisers() {
      setError(null);

      try {
        const summary = await fetchTopMoversSummary(controller.signal);

        if (!isActive) {
          return;
        }

        setItems(Array.isArray(summary.risers) ? summary.risers : []);
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        if (!isActive) {
          return;
        }

        console.error("Failed to load top risers:", error);

        setItems([]);
        setError("Unable to load top risers.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadTopRisers();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, []);

  if (error) {
    return <div role="alert">{error}</div>;
  }

  return <TopRisersWidget items={items} mode="risers" embedded />;
}
