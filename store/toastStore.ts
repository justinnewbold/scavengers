import { create } from 'zustand';

export type ToastType = 'error' | 'success' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  show: (message: string, type?: ToastType, duration?: number) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

let nextId = 0;
const toastTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  show: (message: string, type: ToastType = 'error', duration = 4000) => {
    const id = `toast-${++nextId}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));

    if (duration > 0) {
      const timerId = setTimeout(() => {
        toastTimers.delete(id);
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
      toastTimers.set(id, timerId);
    }
  },

  dismiss: (id: string) => {
    const timerId = toastTimers.get(id);
    if (timerId) {
      clearTimeout(timerId);
      toastTimers.delete(id);
    }
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  dismissAll: () => {
    toastTimers.forEach((timerId) => clearTimeout(timerId));
    toastTimers.clear();
    set({ toasts: [] });
  },
}));
