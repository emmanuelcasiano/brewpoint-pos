import {
  createApiRequest,
  type SignInRequest,
  type StaffMe,
  type StaffSignInResponse,
  type TwoStepCodeRequest,
  type TwoStepSetupResponse,
} from '@brewpoint/shared';

// Typed calls to the server. The staff session is the httpOnly bp_staff_session cookie, which
// the browser sends by itself; this code never sees the token.
const request = createApiRequest((url, init) => fetch(url, init));

export const api = {
  signIn: (body: SignInRequest) =>
    request<StaffSignInResponse>('/console/auth/sign-in', { method: 'POST', body }),
  verifyTwoStep: (body: TwoStepCodeRequest) =>
    request<StaffMe>('/console/auth/two-step', { method: 'POST', body }),
  beginTwoStepSetup: () =>
    request<TwoStepSetupResponse>('/console/auth/two-step/setup', { method: 'POST' }),
  confirmTwoStepSetup: (body: TwoStepCodeRequest) =>
    request<StaffMe>('/console/auth/two-step/setup/confirm', { method: 'POST', body }),
  signOut: () => request<undefined>('/console/auth/sign-out', { method: 'POST' }),
  me: () => request<StaffMe>('/console/auth/me'),
};
