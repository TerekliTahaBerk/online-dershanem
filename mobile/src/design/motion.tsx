import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Animated, Easing, Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { useDesign } from './theme';

export const motion = { enter: 240, press: 90, stagger: 65 } as const;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Optional native feedback must never delay or fail the user's action. */
export function selectionFeedback() {
  if (Platform.OS === 'ios' || Platform.OS === 'android') void Haptics.selectionAsync().catch(() => undefined);
}

/** Native-driver press feedback, with complete reduced-motion support. */
export function MotionPressable({ style, onPressIn, onPressOut, onHoverIn, onHoverOut, onPress, feedback = true, ...props }: PressableProps & { feedback?: boolean }) {
  const { reduceMotion } = useDesign();
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduceMotion) { scale.stopAnimation(); scale.setValue(1); }
    return () => scale.stopAnimation();
  }, [reduceMotion, scale]);
  const animate = (pressed: boolean) => {
    if (reduceMotion) return;
    Animated.timing(scale, { toValue: pressed ? 0.985 : 1, duration: pressed ? motion.press : 160, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };
  return <AnimatedPressable {...props}
    onPressIn={(event) => { setPressed(true); animate(true); onPressIn?.(event); }}
    onPressOut={(event) => { setPressed(false); animate(false); onPressOut?.(event); }}
    onHoverIn={(event) => { setHovered(true); onHoverIn?.(event); }}
    onHoverOut={(event) => { setHovered(false); onHoverOut?.(event); }}
    onPress={(event) => { if (feedback && !reduceMotion) selectionFeedback(); onPress?.(event); }}
    // Animated components need a resolved style, not Pressable's callback.
    style={[typeof style === 'function' ? style({ pressed, hovered }) : style, { transform: [{ scale }] }]}
  />;
}

/** Content enters once on mount; fetching/refreshing never replays it. */
export function Entrance({ children, delay = 0, style }: PropsWithChildren<{ delay?: number; style?: StyleProp<ViewStyle> }>) {
  const { reduceMotion } = useDesign();
  const progress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const didEnter = useRef(false);
  useEffect(() => {
    if (reduceMotion || didEnter.current) { didEnter.current = true; progress.setValue(1); return; }
    didEnter.current = true;
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: motion.enter, delay: Math.min(delay, 200), easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [delay, progress, reduceMotion]);
  return <Animated.View style={[style, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>{children}</Animated.View>;
}
