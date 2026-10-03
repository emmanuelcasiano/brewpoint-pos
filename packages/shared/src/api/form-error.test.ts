import { describe, expect, it } from 'vitest';
import { ApiRequestError, OFFLINE_MESSAGE } from './client';
import { formErrorOf } from './form-error';

const FIELDS = ['email', 'password'] as const;

describe('formErrorOf', () => {
  it('puts an input error under its field', () => {
    const error = new ApiRequestError(400, 'invalid_input', 'Enter an email like name@shop.com.', {
      field: 'email',
    });

    expect(formErrorOf(error, FIELDS)).toEqual({
      fields: { email: 'Enter an email like name@shop.com.' },
      banner: null,
    });
  });

  it('sends a code to the field the caller names', () => {
    const error = new ApiRequestError(401, 'wrong_credentials', 'Wrong email or password.');

    expect(formErrorOf(error, FIELDS, { wrong_credentials: 'password' })).toEqual({
      fields: { password: 'Wrong email or password.' },
      banner: null,
    });
  });

  it('shows a lock in a warning banner and no connection in a neutral one', () => {
    const locked = new ApiRequestError(
      423,
      'account_locked',
      'This account is locked until 3:15 PM.',
    );
    const offline = new ApiRequestError(0, 'offline', OFFLINE_MESSAGE);

    expect(formErrorOf(locked, FIELDS).banner).toEqual({
      tone: 'warning',
      message: 'This account is locked until 3:15 PM.',
    });
    expect(formErrorOf(offline, FIELDS).banner).toEqual({
      tone: 'offline',
      message: OFFLINE_MESSAGE,
    });
  });

  it('ignores a field the form does not have', () => {
    const error = new ApiRequestError(400, 'invalid_input', 'Bad token.', { field: 'token' });

    expect(formErrorOf(error, FIELDS)).toEqual({
      fields: {},
      banner: { tone: 'warning', message: 'Bad token.' },
    });
  });
});
