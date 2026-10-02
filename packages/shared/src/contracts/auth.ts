// Sign-in rules the server enforces and the apps check before sending (Module 03).

/** Passwords: at least 10 characters, no composition rules. */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

/** POS PINs: 4 to 6 digits. */
export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 6;

/** Wrong PINs in a row before a user is locked on a device, and for how long. */
export const PIN_MAX_TRIES = 5;
export const PIN_LOCK_MINUTES = 5;

/** Staff two-step codes: six digits from an authenticator app. */
export const TWO_STEP_CODE_LENGTH = 6;
