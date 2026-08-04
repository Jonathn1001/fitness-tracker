import { isAxiosError } from 'axios'

export const GENERIC_ERROR = 'Something went wrong. Please try again.'

/**
 * One place that turns a thrown request into something a user can read.
 *
 * Every page had invented its own version of this: one swallowed the error
 * into a fixed string, one dug the message out of the response, one handled a
 * single status code, and the two loggers had no catch at all.
 */
export function apiErrorMessage(err: unknown, fallback = GENERIC_ERROR) {
  if (!isAxiosError(err)) return fallback

  // The offline queue absorbs network failures before they reach here, so a
  // missing response means the request could not even be queued.
  if (!err.response) {
    return 'No connection, and this change could not be saved offline. Please try again.'
  }

  const data = err.response.data as { message?: string | string[] } | undefined
  const message = data?.message

  // class-validator returns one entry per failed constraint.
  if (Array.isArray(message)) return message[0] ?? fallback
  if (typeof message === 'string' && message.trim()) return message
  return fallback
}
