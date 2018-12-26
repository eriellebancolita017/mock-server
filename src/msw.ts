import * as R from 'ramda'
import assertUrl, { Mask, ParsedUrl } from './utils/assertUrl'
import stringifyMask from './utils/stringifyMask'
import res, { MockedResponse, ResponseComposition } from './response'
import context, { MockedContext } from './context'

export enum RESTMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  OPTIONS = 'OPTIONS',
  DELETE = 'DELETE',
}

type ResponseResolver = (
  req: Request,
  res: ResponseComposition,
  context: MockedContext,
) => MockedResponse

type Routes = Record<RESTMethod, { [route: string]: ResponseResolver }>

interface Options {
  scope: string
}

const serviceWorkerPath = './mockServiceWorker.js'
const defaultOptions: Options = {
  scope: '/',
}

export class MockServiceWorker {
  worker: ServiceWorker
  workerRegistration: ServiceWorkerRegistration
  routes: Routes

  constructor() {
    if (!('serviceWorker' in navigator)) {
      console.error(
        'Failed to instantiate MockServiceWorker: Your current environment does not support Service Workers. ' +
          'See more details on https://caniuse.com/serviceworkers',
      )
      return null
    }

    /** @todo Consider removing event listeners upon destruction */
    navigator.serviceWorker.addEventListener('message', this.interceptRequest)
    window.addEventListener('beforeunload', () => {
      /**
       * Deactivate requests interception before page unload.
       * Initial page load requests client resources such as HTML, CSS, JS,
       * which will go through the MSW in favor to be intercepted.
       * Such interception must never happen to ensure proper page load.
       *
       * When the client-side JavaScript initializes, it will call to "msw.start()"
       * which will signal active ServiceWorker to resume requests interception.
       */
      if (this.worker && this.worker.state !== 'redundant') {
        this.worker.postMessage('MOCK_DEACTIVATE')
      }
    })

    if (typeof window !== 'undefined') {
      ;(window as any).msw = this
    }

    return this
  }

  /**
   * Registers a new instance of ServiceWorker.
   */
  start(options: Options): Promise<ServiceWorkerRegistration | void> {
    if (this.workerRegistration) {
      return this.workerRegistration.update()
    }

    const resolvedOptions = Object.assign({}, defaultOptions, options)

    navigator.serviceWorker
      .register(serviceWorkerPath, resolvedOptions)
      .then((reg) => {
        const workerInstance = reg.active || reg.installing || reg.waiting

        workerInstance.postMessage('MOCK_ACTIVATE')
        this.worker = workerInstance
        this.workerRegistration = reg

        return reg
      })
      .catch(console.error)
  }

  /**
   * Stops a running instance of ServiceWorker.
   */
  stop() {
    if (!this.workerRegistration) {
      console.warn('No active instance of MockServiceWorker is running.')
      return
    }

    this.workerRegistration
      .unregister()
      .then(() => {
        this.worker = null
        this.workerRegistration = null
      })
      .catch((error) => {
        console.error('Failed to unregister MockServiceWorker. %s', error)
      })
  }

  mockRoute = R.curry(
    (method: RESTMethod, mask: Mask, resolver: ResponseResolver) => {
      this.routes = R.assocPath(
        [method.toLowerCase(), stringifyMask(mask)],
        resolver,
        this.routes,
      )

      return this
    },
  )

  get = this.mockRoute(RESTMethod.GET)
  post = this.mockRoute(RESTMethod.POST)
  put = this.mockRoute(RESTMethod.PUT)
  patch = this.mockRoute(RESTMethod.PATCH)
  options = this.mockRoute(RESTMethod.OPTIONS)
  delete = this.mockRoute(RESTMethod.DELETE)

  /**
   * Intercepts a fetch event from the ServiceWorker.
   * Received event contains request information, that is parsed
   * and matched against the defined routes. Any relevant mocked response
   * is communicated back to the ServiceWorker via the message channel.
   */
  interceptRequest = (event: MessageEvent): void => {
    const req = JSON.parse(event.data, (key, value) => {
      return key === 'headers' ? new Headers(value) : value
    })
    const relevantRoutes = this.routes[req.method.toLowerCase()] || {}
    const parsedRoute = Object.keys(relevantRoutes).reduce<ParsedUrl>(
      (acc, mask) => {
        const parsedRoute = assertUrl(mask, req.url)
        return parsedRoute.matches ? parsedRoute : acc
      },
      null,
    )

    if (parsedRoute === null) {
      return this.postMessage(event, 'MOCK_NOT_FOUND')
    }

    const resolver = relevantRoutes[parsedRoute.mask.toString()]
    const resolvedResponse =
      resolver({ ...req, params: parsedRoute.params }, res, context) || {}

    /**
     * Transform Headers into a list to be stringified preserving multiple
     * header keys. Stringified list is then parsed inside the ServiceWorker.
     */
    resolvedResponse.headers = Array.from(resolvedResponse.headers.entries())

    if (!resolvedResponse) {
      console.warn(
        'Expected a mocking resolver function to return an Object, but got: %s. ',
        resolvedResponse,
      )
    }

    this.postMessage(event, JSON.stringify(resolvedResponse))
  }

  /**
   * Posts a message to the active ServiceWorker.
   * Uses a port of the message channel established in the ServiceWorker.
   */
  postMessage(event: MessageEvent, message: string) {
    const port = event.ports[0]
    port && port.postMessage(message)
  }
}

export default new MockServiceWorker()
