import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  ScrollView,
  View,
} from 'react-native';

const SCREEN_H = Dimensions.get('window').height;

type SnapPoint = 'peek' | 'half' | 'full';

interface SnapConfig {
  peek: number;
  half: number;
  full: number;
}

const DEFAULT_SNAPS: SnapConfig = {
  peek: SCREEN_H * 0.15,
  half: SCREEN_H * 0.5,
  full: SCREEN_H * 0.9,
};

interface BottomSheetProps {
  snap?: SnapPoint;
  snapPoints?: Partial<SnapConfig>;
  onSnapChange?: (snap: SnapPoint) => void;
  children: React.ReactNode;
}

export function BottomSheet({
  snap = 'half',
  snapPoints,
  onSnapChange,
  children,
}: BottomSheetProps) {
  const snaps: SnapConfig = { ...DEFAULT_SNAPS, ...snapPoints };
  const translateY = useRef(new Animated.Value(SCREEN_H - snaps[snap])).current;
  const lastY = useRef(SCREEN_H - snaps[snap]);

  useEffect(() => {
    const target = SCREEN_H - snaps[snap];
    Animated.spring(translateY, {
      toValue: target,
      useNativeDriver: true,
      tension: 60,
      friction: 12,
    }).start();
    lastY.current = target;
  }, [snap]);

  const snapTo = (point: SnapPoint) => {
    const target = SCREEN_H - snaps[point];
    lastY.current = target;
    Animated.spring(translateY, {
      toValue: target,
      useNativeDriver: true,
      tension: 60,
      friction: 12,
    }).start();
    onSnapChange?.(point);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => Math.abs(dy) > 5,
      onPanResponderGrant: () => {
        translateY.stopAnimation();
      },
      onPanResponderMove: (_, { dy }) => {
        const next = Math.max(
          SCREEN_H - snaps.full,
          Math.min(SCREEN_H - snaps.peek, lastY.current + dy)
        );
        translateY.setValue(next);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        const current = lastY.current + dy;
        const midPeekHalf = SCREEN_H - (snaps.peek + snaps.half) / 2;
        const midHalfFull = SCREEN_H - (snaps.half + snaps.full) / 2;

        let target: SnapPoint;
        if (vy < -0.5 || current < midHalfFull) {
          target = 'full';
        } else if (vy > 0.5 || current > midPeekHalf) {
          target = 'peek';
        } else {
          target = 'half';
        }
        snapTo(target);
      },
    })
  ).current;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        height: snaps.full,
        bottom: -(SCREEN_H - snaps.full),
        transform: [{ translateY }],
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 20,
      }}
    >
      {/* Drag handle */}
      <View {...panResponder.panHandlers} style={{ paddingVertical: 12, alignItems: 'center' }}>
        <View
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: '#d1d5db',
          }}
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </Animated.View>
  );
}
