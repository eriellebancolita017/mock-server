import { errors } from './errors'
import { data } from './data'
import { response } from '../response'

describe('errors', () => {
  describe('given at list of errors', () => {
    let result: ReturnType<typeof response>

    beforeAll(() => {
      result = response(errors([{ message: 'Error message' }]))
    })

    it('should have "Content-Type" as "application/json"', () => {
      expect(result.headers.get('content-type')).toEqual('application/json')
    })

    it('should have body set to the given JSON nested in the "errors" property', () => {
      expect(result).toHaveProperty(
        'body',
        JSON.stringify({
          errors: [
            {
              message: 'Error message',
            },
          ],
        }),
      )
    })
  })
  describe('given specifying errors multiple times', () => {
    let result: ReturnType<typeof response>

    beforeAll(() => {
      result = response(
        errors([{ message: 'First error message' }]),
        errors([{ message: 'Second error message' }]),
      )
    })

    it('should have "Content-Type" as "application/json"', () => {
      expect(result.headers.get('content-type')).toEqual('application/json')
    })

    it('should have body set to the given JSON nested in the "errors" property merging each "errors" call', () => {
      expect(result).toHaveProperty(
        'body',
        JSON.stringify({
          errors: [
            {
              message: 'First error message',
            },
            {
              message: 'Second error message',
            },
          ],
        }),
      )
    })
  })
  describe('given composed with data', () => {
    let result: ReturnType<typeof response>

    beforeAll(() => {
      result = response(
        data({ name: 'msw' }),
        errors([{ message: 'is great' }]),
      )
    })

    it('should have body set to the given JSON nested in the "data" property', () => {
      expect(result).toHaveProperty(
        'body',
        `{\"data\":{\"name\":\"msw\"},\"errors\":[{\"message\":\"is great\"}]}`,
      )
    })
  })
})
