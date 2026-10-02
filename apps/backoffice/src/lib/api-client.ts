import {
  createApiRequest,
  type ForgotPasswordRequest,
  type PasswordLinkInfo,
  type SetPasswordRequest,
  type ShopMe,
  type SignInRequest,
} from '@brewpoint/shared';

// Typed calls to the server. The session is the httpOnly bp_session cookie, which the browser
// sends by itself; this code never sees the token.
const request = createApiRequest((url, init) => fetch(url, init));

export const api = {
  signIn: (body: SignInRequest) => request<ShopMe>('/auth/sign-in', { method: 'POST', body }),
  signOut: () => request<undefined>('/auth/sign-out', { method: 'POST' }),
  me: () => request<ShopMe>('/auth/me'),
  forgotPassword: (body: ForgotPasswordRequest) =>
    request<undefined>('/auth/password/forgot', { method: 'POST', body }),
  passwordLink: (token: string) =>
    request<PasswordLinkInfo>(`/auth/password/link?token=${encodeURIComponent(token)}`),
  setPassword: (body: SetPasswordRequest) =>
    request<undefined>('/auth/password/set', { method: 'POST', body }),
};
