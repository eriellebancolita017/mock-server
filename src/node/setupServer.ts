import { headersToObject } from 'headers-utils'
import {
  RequestInterceptor,
  MockedResponse as MockedInterceptedResponse,
} from 'node-request-interceptor'
import { RequestHandler, MockedRequest } from '../handlers/requestHandler'
import { getResponse } from '../utils/getResponse'

export const setupServer = (...handlers: RequestHandler<any, any>[]) => {
  let interceptor: RequestInterceptor

  return {
    open() {
      interceptor = new RequestInterceptor()
      interceptor.use(async (req) => {
        const mockedRequest: MockedRequest = {
          url: req.url,
          method: req.method,
          body: req.body || '',
          query: req.query,
          // @ts-ignore
          headers: {},
          params: {},
          redirect: 'manual',
          referrer: '',
          keepalive: false,
          cache: 'default',
          mode: 'cors',
          referrerPolicy: 'no-referrer',
          integrity: '',
          destination: 'document',
          bodyUsed: false,
          credentials: 'same-origin',
        }

        const { response } = await getResponse(mockedRequest, handlers)

        if (!response) {
          return
        }

        return new Promise<MockedInterceptedResponse>((resolve) => {
          setTimeout(() => {
            resolve({
              status: response.status,
              statusText: response.statusText,
              headers: headersToObject(response.headers),
              body: response.body,
            })
          }, response.delay)
        })
      })
    },
    close() {
      interceptor.restore()
    },
  }
}
