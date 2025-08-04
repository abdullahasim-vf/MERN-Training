import { create } from 'zustand';

const useCounterStore = create((set) => ({
  count: 0,
  name: 'Abdullah',
  changeName: (name) => set({ name }),
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0, name: 'Abdullah' }),
}));

useCounterStore.subscribe(console.log);

useCounterStore.subscribe(
  (state) => state.count,
  (newCount, oldCount) => {
    console.log(`Count changed from ${oldCount} to ${newCount}`);
  }
);

// subscribe to name changes
 useCounterStore.subscribe(
  (state) => state.name,
  (newName, oldName) => {
    console.log(`Name changed from "${oldName}" to "${newName}"`);
  }
);

export default useCounterStore;
