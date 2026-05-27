"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import type { ID, Project } from "@/lib/renovation/types";

const STORAGE_KEY = "renotasker-selected-project";

type SelectedProjectContextValue = {
  selectedProjectId: ID | null;
  selectedProject: Project | null;
  setSelectedProjectId: (id: ID | null) => void;
};

const SelectedProjectContext = createContext<SelectedProjectContextValue | null>(null);

export function SelectedProjectProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { projects, isRenovationDataReady } = useRenovation();
  const [storedId, setStoredId] = useState<ID | null>(null);
  const [requestedId, setRequestedId] = useState<ID | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setStoredId(raw);
    } catch {
      /* ignore */
    }
  }, []);

  const queryId = searchParams.get("project");
  useEffect(() => {
    if (!requestedId) return;
    if (projects.some((project) => project.id === requestedId)) {
      setRequestedId(null);
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setRequestedId((current) => (current === requestedId ? null : current));
    }, 5_000);
    return () => window.clearTimeout(timeoutId);
  }, [projects, requestedId]);

  const selectedProjectId = useMemo(() => {
    if (queryId && projects.some((p) => p.id === queryId)) return queryId;
    if (storedId && projects.some((p) => p.id === storedId)) return storedId;
    if (requestedId && (requestedId === queryId || requestedId === storedId)) return requestedId;
    if (isRenovationDataReady && projects.length === 1) return projects[0]!.id;
    return null;
  }, [queryId, storedId, requestedId, projects, isRenovationDataReady]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const setSelectedProjectId = useCallback(
    (id: ID | null) => {
      try {
        if (id) localStorage.setItem(STORAGE_KEY, id);
        else localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      setStoredId(id);
      setRequestedId(id);

      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("project", id);
      else params.delete("project");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const value = useMemo(
    () => ({ selectedProjectId, selectedProject, setSelectedProjectId }),
    [selectedProjectId, selectedProject, setSelectedProjectId]
  );

  return (
    <SelectedProjectContext.Provider value={value}>{children}</SelectedProjectContext.Provider>
  );
}

export function useSelectedProject() {
  const ctx = useContext(SelectedProjectContext);
  if (!ctx) {
    throw new Error("useSelectedProject must be used within SelectedProjectProvider");
  }
  return ctx;
}
