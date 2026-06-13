"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { carteiraClients } from "@/features/carteira/mock-clients";

import {
  buildMockPointEvents,
  buildMonthlyGamificationSummary,
  calculateInteractionPointEvents,
  clonePerformanceCampaign,
  defaultPerformanceCampaign,
  summarizePointEvents,
} from "./service";
import type {
  InteractionPointInput,
  MonthlyGamificationSummary,
  PerformanceCampaign,
  PointEvent,
} from "./types";

const DEFAULT_MONTH = "2026-05";
const CAMPAIGN_STORAGE_KEY = "fenie.performanceCampaign";

type PointsToast = {
  id: string;
  points: number;
  label: string;
};

type GamificationContextValue = {
  events: PointEvent[];
  campaign: PerformanceCampaign;
  summary: MonthlyGamificationSummary;
  getSummary: (month: string) => MonthlyGamificationSummary;
  updateCampaign: (campaign: PerformanceCampaign) => void;
  awardInteractionPoints: (input: InteractionPointInput) => PointEvent[];
};

const GamificationContext = createContext<GamificationContextValue | null>(null);

function getInitialCampaign() {
  if (typeof window === "undefined") {
    return clonePerformanceCampaign(defaultPerformanceCampaign);
  }

  try {
    const storedCampaign = window.localStorage.getItem(CAMPAIGN_STORAGE_KEY);

    if (!storedCampaign) {
      return clonePerformanceCampaign(defaultPerformanceCampaign);
    }

    const parsedCampaign = JSON.parse(storedCampaign) as PerformanceCampaign;

    return clonePerformanceCampaign({
      ...defaultPerformanceCampaign,
      ...parsedCampaign,
      marcos:
        Array.isArray(parsedCampaign.marcos) &&
        parsedCampaign.marcos.length > 0
          ? parsedCampaign.marcos
          : defaultPerformanceCampaign.marcos,
    });
  } catch {
    return clonePerformanceCampaign(defaultPerformanceCampaign);
  }
}

export function GamificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [events, setEvents] = useState<PointEvent[]>(() =>
    buildMockPointEvents(carteiraClients),
  );
  const [campaign, setCampaign] =
    useState<PerformanceCampaign>(getInitialCampaign);
  const [toasts, setToasts] = useState<PointsToast[]>([]);

  const getSummary = useCallback(
    (month: string) => buildMonthlyGamificationSummary(events, month, campaign),
    [campaign, events],
  );

  const summary = useMemo(() => getSummary(DEFAULT_MONTH), [getSummary]);

  const updateCampaign = useCallback((nextCampaign: PerformanceCampaign) => {
    const clonedCampaign = clonePerformanceCampaign(nextCampaign);

    setCampaign(clonedCampaign);
    window.localStorage.setItem(
      CAMPAIGN_STORAGE_KEY,
      JSON.stringify(clonedCampaign),
    );
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const awardInteractionPoints = useCallback(
    (input: InteractionPointInput) => {
      const nextEvents = calculateInteractionPointEvents(input);

      if (nextEvents.length === 0) {
        return nextEvents;
      }

      setEvents((current) => [...nextEvents, ...current]);

      const toastSummary = summarizePointEvents(nextEvents);
      const toast: PointsToast = {
        id: nextEvents[0].id,
        points: toastSummary.points,
        label: toastSummary.label,
      };

      setToasts((current) => [toast, ...current].slice(0, 3));
      window.setTimeout(() => dismissToast(toast.id), 3600);

      return nextEvents;
    },
    [dismissToast],
  );

  const value = useMemo<GamificationContextValue>(
    () => ({
      events,
      campaign,
      summary,
      getSummary,
      updateCampaign,
      awardInteractionPoints,
    }),
    [awardInteractionPoints, campaign, events, getSummary, summary, updateCampaign],
  );

  return (
    <GamificationContext.Provider value={value}>
      {children}
      <PointsToastStack toasts={toasts} onDismiss={dismissToast} />
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const context = useContext(GamificationContext);

  if (!context) {
    throw new Error("useGamification must be used within GamificationProvider");
  }

  return context;
}

function PointsToastStack({
  toasts,
  onDismiss,
}: {
  toasts: PointsToast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-[70] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="rounded-lg border border-primary/20 bg-card px-3 py-2 text-sm text-foreground shadow-lg transition-all duration-200"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold text-primary">
                +{toast.points} pts
                <span className="font-normal text-muted-foreground"> · </span>
                <span className="text-foreground">{toast.label}</span>
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Pontuação registrada no mês.
              </div>
            </div>
            <button
              type="button"
              className="text-xs text-muted-foreground transition hover:text-foreground"
              onClick={() => onDismiss(toast.id)}
              aria-label="Fechar feedback de pontos"
            >
              Fechar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
