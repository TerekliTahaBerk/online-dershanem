import type { MobileYonTask } from '@contracts/yon';
import { act, renderHook } from '@testing-library/react-native';

import { useTaskCompletion } from './hooks';

const mockCelebrate = jest.fn();
const mockMutate = jest.fn();
const mockInvalidate = jest.fn(async () => undefined);
jest.mock('@/design/celebration', () => ({ useCelebration: () => mockCelebrate }));
jest.mock('@/lib/auth/session-provider', () => ({ useSession: () => ({ api: {} }) }));
jest.mock('./shared', () => ({ useInvalidateYon: () => mockInvalidate }));
jest.mock('@tanstack/react-query', () => ({ useMutation: () => ({ mutateAsync: mockMutate, isPending: false }) }));
const task = { id: 'task-1', status: 'PLANNED', linkedAssignment: false } as MobileYonTask;
beforeEach(() => jest.clearAllMocks());

test('confirmed new DONE celebrates before refetch can remount the task body', async () => {
  mockMutate.mockResolvedValueOnce({ status: 'DONE', repeated: false });
  const h = renderHook(() => useTaskCompletion(task));
  await act(async () => { await h.result.current.submit({ status: 'DONE' }); });
  expect(mockCelebrate).toHaveBeenCalledWith({ key: 'yon:task-1', kind: 'task' });
  expect(mockCelebrate.mock.invocationCallOrder[0]).toBeLessThan(mockInvalidate.mock.invocationCallOrder[0]);
});

test.each([{ status: 'DONE', repeated: true }, { status: 'PARTIAL', repeated: false }, { status: 'SKIPPED', repeated: false }, { status: 'IN_PROGRESS', repeated: false }])('does not celebrate replay or non-completion %j', async (response) => {
  mockMutate.mockResolvedValueOnce(response);
  const h = renderHook(() => useTaskCompletion(task));
  await act(async () => { await h.result.current.submit({ status: 'DONE' }); });
  expect(mockCelebrate).not.toHaveBeenCalled();
});

test('failed write never celebrates', async () => {
  mockMutate.mockRejectedValueOnce(new Error('network'));
  const h = renderHook(() => useTaskCompletion(task));
  await act(async () => { expect(await h.result.current.submit({ status: 'DONE' })).toBe(false); });
  expect(mockCelebrate).not.toHaveBeenCalled();
});
