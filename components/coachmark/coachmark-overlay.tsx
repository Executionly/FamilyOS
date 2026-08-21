import React, { useEffect } from 'react';
import { View, Text, Pressable, Dimensions, Modal } from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { useCoachmark } from '@/lib/coachmark/coachmark-context';
import { useColors } from '@/hooks/use-colors';

const SPOTLIGHT_PADDING = 8;
const TOOLTIP_HEIGHT_ESTIMATE = 160;
const TOP_PADDING_ON_SCROLL = 120;

export function CoachmarkOverlay() {
  const colors = useColors();
  const {
    steps,
    activeIndex,
    isActive,
    next,
    skip,
    getRef,
    scrollViewRef,
    scrollOffsetRef,
    scrollContainerYRef,
    updateMeasurements,
    invalidateMeasurements,
  } = useCoachmark();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  const step = steps[activeIndex];

  // Scroll the active step's target into view, then re-measure its on-screen
  // position once scrolling settles. The Modal below blocks touch on the
  // underlying ScrollView, so without this, any target below the fold is
  // simply unreachable — there's no way for the user to scroll to it themselves.
  //
  // Deliberately avoids measuring the ScrollView's own ref directly — under the
  // New Architecture, ScrollView is a composite component and calling native
  // measurement methods on its ref is unreliable (can silently no-op or return
  // stale/incorrect values rather than throwing). Instead this uses
  // scrollContainerYRef — the on-screen Y position of a plain wrapping View
  // around the ScrollView, measured once on mount via a normal View ref, which
  // measureInWindow already handles correctly. That position is fixed (it
  // doesn't move as the content scrolls), so it only needs measuring once.
  useEffect(() => {
    if (!isActive || !step) return;

    const targetRef = getRef(step.id);
    if (!targetRef?.current) return;

    invalidateMeasurements(step.id);

    const remeasure = () => {
      targetRef.current?.measureInWindow((wx: number, wy: number, w: number, h: number) => {
        updateMeasurements(step.id, { x: wx, y: wy, width: w, height: h });
      });
    };

    if (scrollViewRef?.current && scrollOffsetRef && scrollContainerYRef) {
      targetRef.current.measureInWindow((targetWinX: number, targetWinY: number) => {
        const containerY = scrollContainerYRef.current ?? 0;
        const currentOffset = scrollOffsetRef.current ?? 0;
        const desiredY = currentOffset + (targetWinY - containerY) - TOP_PADDING_ON_SCROLL;
        scrollViewRef.current?.scrollTo({ y: Math.max(desiredY, 0), animated: true });
        setTimeout(remeasure, 450); // let the scroll animation finish before trusting the new position
      });
    } else {
      remeasure(); // scroll wiring incomplete for this screen — just measure where it already is
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, step?.id]);

  // Grace period before concluding a step is genuinely unmeasurable. Needs to be
  // longer than the ~450ms scroll-then-remeasure sequence above can take.
  useEffect(() => {
    if (!isActive || !step) return;
    if (step.measurements) return;

    const timer = setTimeout(() => {
      next();
    }, 900);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, step?.id, !!step?.measurements]);

  if (!isActive) return null;
  if (!step?.measurements) return null;

  const { x, y, width, height } = step.measurements;
  const rectX = x - SPOTLIGHT_PADDING;
  const rectY = y - SPOTLIGHT_PADDING;
  const rectW = width + SPOTLIGHT_PADDING * 2;
  const rectH = height + SPOTLIGHT_PADDING * 2;

  const roomBelow = screenHeight - (rectY + rectH);
  const tooltipBelow = roomBelow > TOOLTIP_HEIGHT_ESTIMATE + 20;
  const tooltipTop = tooltipBelow
    ? rectY + rectH + 12
    : Math.max(rectY - TOOLTIP_HEIGHT_ESTIMATE - 12, 40);

  const isLastStep = activeIndex === steps.length - 1;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={{ flex: 1 }}>
        <Svg width={screenWidth} height={screenHeight} style={{ position: 'absolute' }}>
          <Defs>
            <Mask id="spotlight-mask">
              <Rect x={0} y={0} width={screenWidth} height={screenHeight} fill="white" />
              <Rect x={rectX} y={rectY} width={rectW} height={rectH} rx={14} fill="black" />
            </Mask>
          </Defs>
          <Rect
            x={0}
            y={0}
            width={screenWidth}
            height={screenHeight}
            fill="rgba(0,0,0,0.75)"
            mask="url(#spotlight-mask)"
          />
        </Svg>

        {/* A thin highlight ring around the spotlight cutout for definition */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: rectX,
            top: rectY,
            width: rectW,
            height: rectH,
            borderRadius: 14,
            borderWidth: 2,
            borderColor: colors.primary,
          }}
        />

        <View
          style={{
            position: 'absolute',
            top: tooltipTop,
            left: 20,
            right: 20,
            backgroundColor: colors.background,
            borderRadius: 20,
            padding: 20,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted, letterSpacing: 1 }}>
            {activeIndex + 1} OF {steps.length}
          </Text>
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.foreground, marginTop: 4 }}>
            {step.title}
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 6, lineHeight: 19 }}>
            {step.description}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 16,
            }}
          >
            <Pressable onPress={skip} hitSlop={8}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.muted }}>Skip</Text>
            </Pressable>
            <Pressable
              onPress={next}
              style={{
                backgroundColor: colors.primary,
                paddingVertical: 10,
                paddingHorizontal: 20,
                borderRadius: 12,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>
                {isLastStep ? 'Done' : 'Next'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}