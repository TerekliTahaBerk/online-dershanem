import { fireEvent, render } from '@testing-library/react-native';
import { PreviewReadOnlyContext } from '@/lib/auth/preview-context';
import { Button } from './controls';

it('View As hides write actions, retains navigation, teacher mode retains writes', () => {
  const write = jest.fn();
  const navigate = jest.fn();
  const content = <><Button mutation label="Kaydet" onPress={write} /><Button label="Ayrıntı" onPress={navigate} /></>;
  const screen = render(<PreviewReadOnlyContext.Provider value>{content}</PreviewReadOnlyContext.Provider>);
  expect(screen.queryByText('Kaydet')).toBeNull();
  fireEvent.press(screen.getByText('Ayrıntı'));
  expect(navigate).toHaveBeenCalledTimes(1);
  expect(write).not.toHaveBeenCalled();
  screen.rerender(<PreviewReadOnlyContext.Provider value={false}>{content}</PreviewReadOnlyContext.Provider>);
  fireEvent.press(screen.getByText('Kaydet'));
  expect(write).toHaveBeenCalledTimes(1);
});
