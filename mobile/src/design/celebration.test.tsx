import * as Haptics from 'expo-haptics';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, AppState, Button } from 'react-native';

import { CelebrationProvider, useCelebration } from './celebration';

let mockReduceMotion = true;
jest.mock('./theme', () => ({ useDesign: () => ({ product: jest.requireActual('./products').productTheme('OD'), reduceMotion: mockReduceMotion }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }) }));

function Actions() {
  const celebrate = useCelebration();
  return <><Button title="Complete" onPress={() => celebrate({ key: 'task-1', kind: 'task' })} /><Button title="Submit" onPress={() => celebrate({ key: 'submission-1', kind: 'submission' })} /></>;
}
beforeEach(() => { jest.useFakeTimers(); mockReduceMotion = true; AppState.currentState = 'active'; });
afterEach(() => { cleanup(); jest.clearAllTimers(); jest.useRealTimers(); jest.restoreAllMocks(); jest.clearAllMocks(); });

test('reduced motion keeps confirmation and announcement without confetti or haptics', () => {
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  const timing = jest.spyOn(Animated, 'timing');
  const screen = render(<CelebrationProvider><Actions /></CelebrationProvider>);
  fireEvent.press(screen.getByText('Complete'));
  expect(screen.getByText('Bir adım daha ileri!')).toBeTruthy();
  expect(screen.queryByTestId('celebration-confetti')).toBeNull();
  expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  expect(timing).not.toHaveBeenCalled();
  expect(announce).toHaveBeenCalledTimes(1);
  act(() => jest.advanceTimersByTime(4500));
  expect(screen.queryByTestId('celebration')).toBeNull();
});

test('one completed task celebrates once per workspace session, even after dismissal', () => {
  const screen = render(<CelebrationProvider><Actions /></CelebrationProvider>);
  fireEvent.press(screen.getByText('Complete'));
  fireEvent.press(screen.getByLabelText('Kutlamayı kapat'));
  fireEvent.press(screen.getByText('Complete'));
  expect(screen.queryByTestId('celebration')).toBeNull();
  fireEvent.press(screen.getByText('Submit'));
  expect(screen.getByText('Emeğin yola çıktı!')).toBeTruthy();
  expect(screen.queryByText('Bir adım daha ileri!')).toBeNull();
});

test('preview and non-student layouts never show celebrations', () => {
  const screen = render(<CelebrationProvider enabled={false}><Actions /></CelebrationProvider>);
  fireEvent.press(screen.getByText('Complete'));
  expect(screen.queryByTestId('celebration')).toBeNull();
});

test('task success uses a bounded native animation; unavailable haptics never fail confirmation', async () => {
  mockReduceMotion = false;
  jest.mocked(Haptics.notificationAsync).mockRejectedValueOnce(new Error('unavailable'));
  const screen = render(<CelebrationProvider><Actions /></CelebrationProvider>);
  fireEvent.press(screen.getByText('Complete'));
  await act(async () => { await Promise.resolve(); });
  expect(screen.getByTestId('celebration-confetti', { includeHiddenElements: true })).toBeTruthy();
  expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
});

test('background completion never interrupts another app', () => {
  AppState.currentState = 'background';
  const screen = render(<CelebrationProvider><Actions /></CelebrationProvider>);
  fireEvent.press(screen.getByText('Complete'));
  expect(screen.queryByTestId('celebration')).toBeNull();
});
