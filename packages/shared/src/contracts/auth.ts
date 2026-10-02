// Sign-in contracts (Module 03): the rules the server enforces and the apps check before
// sending, and the request and response bodies of the /api/auth, /api/pos/auth and
// /api/console/auth endpoints.

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

/** Until Module 06, the POS names its device and proves it with the demo key in these headers. */
export const DEVICE_ID_HEADER = 'x-brewpoint-device';
export const DEVICE_KEY_HEADER = 'x-brewpoint-device-key';

/** Every error body. `code` is stable to branch on; `message` is shown as written. */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ---------------------------------------------------------------- shop users

export interface SignInRequest {
  email: string;
  password: string;
}

/** The signed-in shop user, on the back-office (`GET /api/auth/me`) or a register. */
export interface ShopMe {
  user: { id: string; name: string; email: string };
  shop: { id: string; name: string; accentHex: string };
  /** Active branches the user works in. */
  branches: { id: string; name: string }[];
  /** `branchId` null: every branch. */
  roles: { branchId: string | null; roleName: string }[];
  surface: 'backoffice' | 'pos';
  /** The register, on the POS. */
  device: { id: string; name: string } | null;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface PasswordLinkInfo {
  purpose: 'invite' | 'password_reset';
  name: string;
  email: string;
}

export interface SetPasswordRequest {
  token: string;
  password: string;
}

// ---------------------------------------------------------------- POS

export interface PinUserEntry {
  id: string;
  name: string;
  roleName: string;
  /** Argon2id PHC string; the POS checks PINs against it offline. */
  pinHash: string;
}

/** The register and its shop, cached with the PIN list so the POS can name them offline. */
export interface PosDeviceSummary {
  id: string;
  name: string;
  branchId: string;
  branchName: string;
  shopName: string;
  accentHex: string;
}

export interface PinUsersResponse {
  device: PosDeviceSummary;
  users: PinUserEntry[];
  /** ISO time the list was made. */
  fetchedAt: string;
}

export interface PinSignInRequest {
  userId: string;
  pin: string;
}

export interface PinSignInResponse {
  /** Sent back as `Authorization: Bearer <token>`. */
  token: string;
  me: ShopMe;
}

export type DeviceAuthEventType = 'signed_in' | 'signed_out' | 'pin_locked';

export interface DeviceAuthEventInput {
  /** uuid v7 made on the device; a resend is recorded once. */
  id: string;
  type: DeviceAuthEventType;
  userId: string;
  /** ISO time it happened on the device. */
  happenedAt: string;
}

export interface DeviceAuthEventsRequest {
  events: DeviceAuthEventInput[];
}

export interface DeviceAuthEventsResponse {
  recorded: number;
  /** Event ids the server could not match to a user of this shop. */
  skipped: string[];
}

// ---------------------------------------------------------------- staff console

export type StaffStage = 'two_step' | 'two_step_setup' | 'active';

export interface StaffSignInResponse {
  /** active: in. two_step: enter the code. two_step_setup: set up two-step first. */
  stage: StaffStage;
  /** First sign-in without two-step: offer setup, with "Set up later". */
  offerTwoStepSetup: boolean;
}

export interface TwoStepCodeRequest {
  code: string;
}

export interface TwoStepSetupResponse {
  /** Base32, for typing into an app by hand. */
  secret: string;
  /** otpauth:// address, shown as a QR code. */
  otpauthUri: string;
}

/** The signed-in staff member (`GET /api/console/auth/me`), at any stage. */
export interface StaffMe {
  stage: StaffStage;
  staff: { id: string; name: string; email: string };
  role: { id: string; name: string };
  twoStepOn: boolean;
}
