import { Headers } from 'headers-utils'
import { MockedRequest } from '../handlers/requestHandler'
import nodeFetch from 'node-fetch'
import { isNodeProcess } from '../utils/isNodeProcess'

const useFetch = isNodeProcess() ? nodeFetch : window.fetch

const gracefully = <ResponseType>(
  promise: Promise<Response>,
): Promise<ResponseType> => {
  return promise.then((res) => {
    if (res.headers.get('content-type')?.includes('json')) {
      return res.json()
    }

    return res.text()
  })
}

export const augmentRequestInit = (requestInit: RequestInit): RequestInit => {
  const headers = new Headers(requestInit.headers)
  headers.set('x-msw-bypass', 'true')

  return {
    ...requestInit,
    headers: headers.getAllHeaders(),
  }
}

/**
 * Wrapper around the native `window.fetch()` function that performs
 * a request bypassing MSW. Requests performed using
 * this function will never be mocked.
 */
export const fetch = <ResponseType = any>(
  input: string | MockedRequest,
  requestInit: RequestInit = {},
) => {
  // Keep the default `window.fetch()` call signature
  if (typeof input === 'string') {
    return gracefully<ResponseType>(
      // TODO: Figure out cross typing of request and response.
      /// @ts-ignore
      useFetch(input, augmentRequestInit(requestInit)),
    )
  }

  const { body } = input
  const compliantReq: RequestInit = augmentRequestInit({
    ...input,
    body: typeof body === 'object' ? JSON.stringify(body) : body,
  })

  return gracefully<ResponseType>(
    // TODO: Figure out cross typing of request and response.
    /// @ts-ignore
    useFetch(input.url.href, compliantReq),
  )
}
