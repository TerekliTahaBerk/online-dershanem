import * as Haptics from 'expo-haptics';
import { fireEvent, render } from '@testing-library/react-native';
import { Animated, Text } from 'react-native';

import { Entrance, MotionPressable } from './motion';

let mockReduceMotion = true;
jest.mock('./theme', () => ({ useDesign: () => ({ reduceMotion: mockReduceMotion }) }));

afterEach(() => { mockReduceMotion = true; jest.restoreAllMocks(); jest.clearAllMocks(); });

test('reduced motion keeps navigation usable without animation or haptics', () => {
  const action = jest.fn();
  const timing = jest.spyOn(Animated, 'timing');
  const screen = render(<MotionPressable onPress={action} testID="target"><Text>Aç</Text></MotionPressable>);
  fireEvent(screen.getByTestId('target'), 'pressIn', {});
  fireEvent.press(screen.getByTestId('target'));
  expect(action).toHaveBeenCalledTimes(1);
  expect(timing).not.toHaveBeenCalled();
  expect(Haptics.selectionAsync).not.toHaveBeenCalled();
});

test('haptics rejection cannot cancel the action', async () => {
  mockReduceMotion = false;
  jest.mocked(Haptics.selectionAsync).mockRejectedValueOnce(new Error('unavailable'));
  const action = jest.fn();
  const screen = render(<MotionPressable onPress={action} testID="target"><Text>Aç</Text></MotionPressable>);
  fireEvent.press(screen.getByTestId('target'));
  await Promise.resolve();
  expect(action).toHaveBeenCalledTimes(1);
});

test('disabled controls cannot trigger actions or selection feedback', () => {
  mockReduceMotion = false;
  const action = jest.fn();
  const screen = render(<MotionPressable disabled onPress={action} testID="target"><Text>Aç</Text></MotionPressable>);
  fireEvent.press(screen.getByTestId('target'));
  expect(action).not.toHaveBeenCalled();
  expect(Haptics.selectionAsync).not.toHaveBeenCalled();
});

test('native animated controls retain layout and pressed-state styling', () => {
  const screen = render(<MotionPressable testID="target" style={({ pressed }) => ({ minHeight: 44, backgroundColor: pressed ? '#000000' : '#ffffff' })}><Text>Aç</Text></MotionPressable>);
  expect(screen.getByTestId('target')).toHaveStyle({ minHeight: 44, backgroundColor: '#ffffff' });
  fireEvent(screen.getByTestId('target'), 'pressIn', {});
  expect(screen.getByTestId('target')).toHaveStyle({ minHeight: 44, backgroundColor: '#000000' });
  fireEvent(screen.getByTestId('target'), 'pressOut', {});
  expect(screen.getByTestId('target')).toHaveStyle({ backgroundColor: '#ffffff' });
});

test('data rerenders never replay content entrance', () => {
  mockReduceMotion = false;
  const timing = jest.spyOn(Animated, 'timing');
  const screen = render(<Entrance><Text>İlk veri</Text></Entrance>);
  expect(timing).toHaveBeenCalledTimes(1);
  screen.rerender(<Entrance><Text>Yeni veri</Text></Entrance>);
  expect(timing).toHaveBeenCalledTimes(1);
});
