import { createFormStore } from './store';

const initial = () => ({
	valid: true,
	errors: [],
	touchedFields: [],
	isSubmitted: false,
	fieldErrorRegistry: [],
});

describe('createFormStore(initialState)', () => {
	it('should expose the initial state by reference', () => {
		const state = initial();
		expect(createFormStore(state).getState()).toBe(state);
	});

	it('should merge a partial update into a NEW snapshot and notify subscribers', () => {
		const store = createFormStore(initial());
		const before = store.getState();
		const listener = vi.fn();
		store.subscribe(listener);
		store.setState({ isSubmitted: true });
		expect(listener).toHaveBeenCalledTimes(1);
		expect(store.getState()).not.toBe(before);
		expect(store.getState()).toEqual({ ...before, isSubmitted: true });
		expect(before.isSubmitted).toBe(false);
	});

	it('should accept an updater function receiving the current state', () => {
		const store = createFormStore(initial());
		store.setState((state) => ({ touchedFields: [...state.touchedFields, 'a'] }));
		expect(store.getState().touchedFields).toEqual(['a']);
	});

	it('should not notify when every updated key keeps its reference', () => {
		const store = createFormStore(initial());
		const listener = vi.fn();
		store.subscribe(listener);
		const { errors } = store.getState();
		store.setState({ isSubmitted: false, errors });
		store.setState({});
		store.setState(() => ({}));
		expect(listener).not.toHaveBeenCalled();
		expect(store.getState().errors).toBe(errors);
	});

	it('should stop notifying after unsubscribe', () => {
		const store = createFormStore(initial());
		const listener = vi.fn();
		const unsubscribe = store.subscribe(listener);
		store.setState({ isSubmitted: true });
		unsubscribe();
		store.setState({ isSubmitted: false });
		expect(listener).toHaveBeenCalledTimes(1);
	});
});
