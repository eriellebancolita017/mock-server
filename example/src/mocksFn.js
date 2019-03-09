import { composeMsw, rest } from 'msw'

const { start } = composeMsw(
  rest.get('https://api.github.com/users/:username', (req, res, { json }) => {
    const { username } = req.params

    return res(
      json({
        avatar_url: 'https://i.imgflip.com/wnv7r.jpg',
        login: username,
        name: 'John Maverick',
        public_repos: Math.ceil(Math.random() * 100),
      }),
    )
  }),
)

start()
