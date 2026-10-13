import { fireEvent, render } from '@testing-library/react-native';

import { LaunchScreen } from './launch-screen';

jest.mock('expo-image', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { Image: (props: Record<string, unknown>) => React.createElement(View, { ...props, testID: 'launch-art' }) };
});

test('native splash readiness is reported once after artwork display', () => {
  const ready = jest.fn();
  const screen = render(<LaunchScreen onReady={ready} />);
  expect(ready).not.toHaveBeenCalled();
  fireEvent(screen.getByTestId('launch-art'), 'display');
  fireEvent(screen.getByTestId('launch-art'), 'display');
  expect(ready).toHaveBeenCalledTimes(1);
});

test('artwork failure renders the logo fallback before releasing native splash', () => {
  const ready = jest.fn();
  const screen = render(<LaunchScreen onReady={ready} />);
  fireEvent(screen.getByTestId('launch-art'), 'error');
  expect(ready).not.toHaveBeenCalled();
  expect(screen.getByTestId('launch-art').props.source).toEqual(require('../../assets/images/launch-logo.png'));
  fireEvent(screen.getByTestId('launch-art'), 'display');
  expect(ready).toHaveBeenCalledTimes(1);
});

test('even a failed fallback never traps the app behind the native splash', () => {
  const ready = jest.fn();
  const screen = render(<LaunchScreen onReady={ready} />);
  fireEvent(screen.getByTestId('launch-art'), 'error');
  fireEvent(screen.getByTestId('launch-art'), 'error');
  expect(ready).toHaveBeenCalledTimes(1);
});
