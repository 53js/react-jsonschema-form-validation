// React >=18 only fires `act()` warnings-free when the environment opts in.
// RTL 13+ sets this flag itself around render/act, but setting it globally
// also covers updates triggered outside RTL helpers (timers, direct events).
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
