import { describe, it, expect } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { apiErrorMessage, GENERIC_ERROR } from './apiError'

const axiosError = (data: unknown, status = 400) => {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data,
  })
}

const networkError = () =>
  new AxiosError('Network Error', 'ERR_NETWORK', {
    headers: new AxiosHeaders(),
  })

describe('apiErrorMessage', () => {
  it('surfaces a string message from the API', () => {
    expect(
      apiErrorMessage(axiosError({ message: 'Email already registered' })),
    ).toBe('Email already registered')
  })

  it('surfaces the first entry when validation returns a list', () => {
    expect(
      apiErrorMessage(
        axiosError({ message: ['password must contain a digit', 'too short'] }),
      ),
    ).toBe('password must contain a digit')
  })

  it('falls back when the response carries no message', () => {
    expect(apiErrorMessage(axiosError({}))).toBe(GENERIC_ERROR)
    expect(apiErrorMessage(axiosError({ message: '   ' }))).toBe(GENERIC_ERROR)
  })

  it('distinguishes a failed request from a rejected one', () => {
    expect(apiErrorMessage(networkError())).toMatch(/No connection/)
  })

  it('falls back for anything that is not an axios error', () => {
    expect(apiErrorMessage(new Error('boom'))).toBe(GENERIC_ERROR)
    expect(apiErrorMessage('nope')).toBe(GENERIC_ERROR)
    expect(apiErrorMessage(undefined)).toBe(GENERIC_ERROR)
  })

  it('honours a caller-supplied fallback', () => {
    expect(apiErrorMessage(new Error('boom'), 'Could not save')).toBe(
      'Could not save',
    )
  })
})
