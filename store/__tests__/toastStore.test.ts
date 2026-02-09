import { useToastStore } from '../toastStore';

beforeEach(() => {
  jest.useFakeTimers();
  useToastStore.setState({ toasts: [] });
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('useToastStore', () => {
  describe('initial state', () => {
    it('should have an empty toasts array', () => {
      const state = useToastStore.getState();
      expect(state.toasts).toEqual([]);
    });
  });

  describe('show', () => {
    it('should add a toast with default type "error"', () => {
      useToastStore.getState().show('Something went wrong');
      const { toasts } = useToastStore.getState();

      expect(toasts).toHaveLength(1);
      expect(toasts[0].message).toBe('Something went wrong');
      expect(toasts[0].type).toBe('error');
      expect(toasts[0].id).toBeDefined();
    });

    it('should use a custom type when provided', () => {
      useToastStore.getState().show('Saved successfully', 'success');
      const { toasts } = useToastStore.getState();

      expect(toasts).toHaveLength(1);
      expect(toasts[0].type).toBe('success');
      expect(toasts[0].message).toBe('Saved successfully');
    });

    it('should support multiple toasts', () => {
      const { show } = useToastStore.getState();
      show('First', 'info');
      show('Second', 'warning');
      show('Third', 'success');

      const { toasts } = useToastStore.getState();
      expect(toasts).toHaveLength(3);
      expect(toasts[0].message).toBe('First');
      expect(toasts[1].message).toBe('Second');
      expect(toasts[2].message).toBe('Third');
    });

    it('should auto-remove toast after duration', () => {
      useToastStore.getState().show('Temporary', 'info', 3000);
      expect(useToastStore.getState().toasts).toHaveLength(1);

      jest.advanceTimersByTime(2999);
      expect(useToastStore.getState().toasts).toHaveLength(1);

      jest.advanceTimersByTime(1);
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it('should not auto-remove when duration is 0', () => {
      useToastStore.getState().show('Persistent', 'error', 0);
      expect(useToastStore.getState().toasts).toHaveLength(1);

      jest.advanceTimersByTime(10000);
      expect(useToastStore.getState().toasts).toHaveLength(1);
    });
  });

  describe('dismiss', () => {
    it('should remove a specific toast by id', () => {
      const { show } = useToastStore.getState();
      show('First', 'info', 0);
      show('Second', 'warning', 0);

      const { toasts } = useToastStore.getState();
      expect(toasts).toHaveLength(2);

      const idToRemove = toasts[0].id;
      useToastStore.getState().dismiss(idToRemove);

      const updated = useToastStore.getState().toasts;
      expect(updated).toHaveLength(1);
      expect(updated[0].message).toBe('Second');
    });
  });

  describe('dismissAll', () => {
    it('should clear all toasts', () => {
      const { show } = useToastStore.getState();
      show('A', 'info', 0);
      show('B', 'error', 0);
      show('C', 'success', 0);

      expect(useToastStore.getState().toasts).toHaveLength(3);

      useToastStore.getState().dismissAll();
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });
  });
});
