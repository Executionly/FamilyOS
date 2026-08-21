import React, { createContext, useContext, useRef, useState, useCallback, RefObject, MutableRefObject } from 'react';
import { View, ScrollView } from 'react-native';

interface Measurements {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CoachmarkStep {
  id: string;
  order: number;
  title: string;
  description: string;
  measurements: Measurements | null;
}

interface CoachmarkContextValue {
  registerTarget: (id: string, order: number, title: string, description: string) => void;
  updateMeasurements: (id: string, measurements: Measurements) => void;
  invalidateMeasurements: (id: string) => void;
  unregisterTarget: (id: string) => void;
  registerRef: (id: string, ref: RefObject<View>) => void;
  getRef: (id: string) => RefObject<View> | undefined;
  scrollViewRef?: RefObject<ScrollView>;
  scrollOffsetRef?: MutableRefObject<number>;
  scrollContainerYRef?: MutableRefObject<number>;
  steps: CoachmarkStep[];
  activeIndex: number;
  isActive: boolean;
  startTour: () => void;
  next: () => void;
  skip: () => void;
}

const CoachmarkContext = createContext<CoachmarkContextValue | null>(null);

export function CoachmarkProvider({
  children,
  onFinish,
  scrollViewRef,
  scrollOffsetRef,
  scrollContainerYRef,
}: {
  children: React.ReactNode;
  onFinish?: () => void;
  scrollViewRef?: RefObject<ScrollView>;
  scrollOffsetRef?: MutableRefObject<number>;
  scrollContainerYRef?: MutableRefObject<number>;
}) {
  const stepsRef = useRef<Map<string, CoachmarkStep>>(new Map());
  const viewRefsRef = useRef<Map<string, RefObject<View>>>(new Map());
  const [, forceRender] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);

  const registerTarget = useCallback((id: string, order: number, title: string, description: string) => {
    const existing = stepsRef.current.get(id);
    stepsRef.current.set(id, {
      id,
      order,
      title,
      description,
      measurements: existing?.measurements ?? null,
    });
    forceRender((n) => n + 1);
  }, []);

  const registerRef = useCallback((id: string, ref: RefObject<View>) => {
    viewRefsRef.current.set(id, ref);
  }, []);

  const getRef = useCallback((id: string) => viewRefsRef.current.get(id), []);

  const updateMeasurements = useCallback((id: string, measurements: Measurements) => {
    const existing = stepsRef.current.get(id);
    if (!existing) return;
    stepsRef.current.set(id, { ...existing, measurements });
    forceRender((n) => n + 1);
  }, []);

  const invalidateMeasurements = useCallback((id: string) => {
    const existing = stepsRef.current.get(id);
    if (!existing) return;
    stepsRef.current.set(id, { ...existing, measurements: null });
    forceRender((n) => n + 1);
  }, []);

  const unregisterTarget = useCallback((id: string) => {
    stepsRef.current.delete(id);
    viewRefsRef.current.delete(id);
    forceRender((n) => n + 1);
  }, []);

  const steps = Array.from(stepsRef.current.values()).sort((a, b) => a.order - b.order);

  const startTour = useCallback(() => setActiveIndex(0), []);

  const next = useCallback(() => {
    setActiveIndex((i) => {
      if (i + 1 >= steps.length) {
        onFinish?.();
        return -1;
      }
      return i + 1;
    });
  }, [steps.length, onFinish]);

  const skip = useCallback(() => {
    setActiveIndex(-1);
    onFinish?.();
  }, [onFinish]);

  return (
    <CoachmarkContext.Provider
      value={{
        registerTarget,
        updateMeasurements,
        invalidateMeasurements,
        unregisterTarget,
        registerRef,
        getRef,
        scrollViewRef,
        scrollOffsetRef,
        scrollContainerYRef,
        steps,
        activeIndex,
        isActive: activeIndex >= 0,
        startTour,
        next,
        skip,
      }}
    >
      {children}
    </CoachmarkContext.Provider>
  );
}

export function useCoachmark() {
  const ctx = useContext(CoachmarkContext);
  if (!ctx) throw new Error('useCoachmark must be used within a CoachmarkProvider');
  return ctx;
}