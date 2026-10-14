import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type DelightIconName = 'sun' | 'task' | 'book' | 'calendar' | 'chat' | 'goal' | 'chart' | 'menu' | 'spark' | 'leaf' | 'exam';

const paths: Record<DelightIconName, string> = {
    sun: 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5',
    task: 'M8 4H6a2 2 0 0 0-2 2v14h16V6a2 2 0 0 0-2-2h-2M8 13l3 3 5-6',
    book: 'M12 6C9 3 5 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-7-1-10 2v15M5 8h3m-3 4h3m8-4h3m-3 4h3',
    calendar: 'M7 2v4m10-4v4M3 9h18M8 14l3 3 5-5',
    chat: 'M20 13a8 8 0 0 1-8 6H8l-5 3 1-6a8 8 0 1 1 16-3M8 10h8m-8 4h4',
    goal: 'M12 12l8-8m-4 0h4v4M14 3a9 9 0 1 0 7 7M13 7a5 5 0 1 0 4 4',
    chart: 'M3 3v17h18M7 15l4-5 4 2 5-7m-4 0h4v4',
    menu: 'M5 6h14M5 12h9M5 18h14',
    spark: 'M12 2l2.7 7.3L22 12l-7.3 2.7L12 22l-2.7-7.3L2 12l7.3-2.7Z',
    leaf: 'M5 19C0 8 9 2 21 3c1 12-5 21-16 16Zm0 0L16 8m-5 5v-5m0 5h5',
    exam: 'M7 2h8l5 5v15H4V5a3 3 0 0 1 3-3Zm8 0v5h5M8 12h8m-8 4h5',
};

/** Shared hand-drawn geometry: round strokes, generous counters, one signature dot. */
export function DelightIcon({ name, color, size = 24, selected = false }: { name: DelightIconName; color: string; size?: number; selected?: boolean }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {name === 'sun' ? <Circle cx={12} cy={12} r={5} fill={selected ? color : 'none'} fillOpacity={0.16} /> : null}
    {name === 'calendar' ? <Rect x={3} y={4} width={18} height={18} rx={4} /> : null}
    {name === 'task' ? <Rect x={8} y={2} width={8} height={4} rx={2} /> : null}
    <Path d={paths[name]} />
    {name === 'menu' || name === 'task' || name === 'book' ? <Circle cx={name === 'menu' ? 19 : 19.5} cy={name === 'menu' ? 12 : 19.5} r={1.6} fill={color} stroke="none" /> : null}
  </Svg>;
}
