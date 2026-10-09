import { fireEvent, render } from '@testing-library/react-native';
import { useState } from 'react';

import { Text } from './text';
import { SegmentedTabs } from './controls';

function Harness() {
  const [value, setValue] = useState<'a' | 'b'>('a');
  return (
    <>
      <SegmentedTabs label="Seçim" value={value} onChange={setValue} options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B', count: 2 }]} />
      <Text>{`seçili:${value}`}</Text>
    </>
  );
}

it('SegmentedTabs: dokunma seçimi değiştirir, seçili sekme erişilebilirlik durumunda', () => {
  const screen = render(<Harness />);
  fireEvent.press(screen.getByTestId('tab-b'));
  expect(screen.getByText('seçili:b')).toBeTruthy();
  expect(screen.getByTestId('tab-b').props.accessibilityState).toMatchObject({ selected: true });
  expect(screen.getByLabelText('B (2)')).toBeTruthy();
});
