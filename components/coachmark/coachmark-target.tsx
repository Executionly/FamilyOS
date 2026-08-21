import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useCoachmark } from '@/lib/coachmark/coachmark-context';

interface CoachmarkTargetProps {
  id: string;
  order: number;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function CoachmarkTarget({ id, order, title, description, children }: CoachmarkTargetProps) {
  const viewRef = useRef<View>(null);
  const { registerTarget, updateMeasurements, unregisterTarget, registerRef } = useCoachmark();

  useEffect(() => {
    registerTarget(id, order, title, description);
    registerRef(id, viewRef);
    return () => unregisterTarget(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, order, title, description]);

  const measure = () => {
    // measureInWindow gives screen-absolute coordinates, which is what the
    // full-screen overlay needs — measure() alone gives parent-relative values.
    viewRef.current?.measureInWindow((x, y, width, height) => {
      updateMeasurements(id, { x, y, width, height });
    });
  };

  return (
    <View ref={viewRef} onLayout={measure} collapsable={false}>
      {children}
    </View>
  );
}