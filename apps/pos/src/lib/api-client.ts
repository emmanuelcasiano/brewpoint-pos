import {
  createApiRequest,
  type DeviceAuthEventsRequest,
  type DeviceAuthEventsResponse,
  type PinSignInRequest,
  type PinSignInResponse,
  type PinUsersResponse,
} from '@brewpoint/shared';
import { deviceHeaders } from '../app/device';

// Typed calls to the server. Device calls carry the register's headers; a signed-in cashier's
// calls carry their bearer token. The POS never needs these to sell: every call may fail
// offline, and the screens carry on from the device's own storage.
const request = createApiRequest((url, init) => fetch(url, init));

export const api = {
  pinUsers: () => request<PinUsersResponse>('/pos/auth/users', { headers: deviceHeaders() }),
  signIn: (body: PinSignInRequest) =>
    request<PinSignInResponse>('/pos/auth/sessions', {
      method: 'POST',
      body,
      headers: deviceHeaders(),
    }),
  signOut: (token: string) =>
    request<undefined>('/pos/auth/sessions/current', {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}` },
    }),
  sendAuthEvents: (body: DeviceAuthEventsRequest) =>
    request<DeviceAuthEventsResponse>('/pos/auth/events', {
      method: 'POST',
      body,
      headers: deviceHeaders(),
    }),
};
