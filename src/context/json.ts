import { ResponseTransformer } from '../response'
import { mergeRight } from '../utils/internal/mergeRight'

type JSONContextOptions = {
  merge?: boolean
}

/**
 * Sets the given value as the JSON body of the response.
 * @example
 * res(json({ key: 'value' }))
 * res(json('Some string'))
 * res(json([1, '2', false, { ok: true }]))
 */
export const json = <BodyTypeJSON>(
  body: BodyTypeJSON,
  { merge = false }: JSONContextOptions = {},
): ResponseTransformer<BodyTypeJSON> => {
  return (res) => {
    res.headers.set('Content-Type', 'application/json')

    if (merge) {
      res.body = mergeRight(body, res.body || {})
    } else {
      res.body = body
    }

    return res
  }
}
