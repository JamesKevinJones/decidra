import type { Connect, Plugin } from 'vite'
import { createChallengeHandler } from './challenge-handler.ts'
import { makeClaudeCaller } from './claude.ts'

const MAX_BODY = 32_000

/**
 * Adds POST /api/challenge to the dev and preview servers. The API key stays in
 * this Node process; the browser only ever sees the reply.
 */
export function challengeApi(mode: 'live' | 'mock', apiKey: string | undefined): Plugin {
  const handle = createChallengeHandler(mode, makeClaudeCaller(apiKey))

  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    if (req.url !== '/api/challenge') return next()

    let body = ''
    let tooBig = false
    req.setEncoding('utf8')
    req.on('data', (chunk: string) => {
      body += chunk
      if (body.length > MAX_BODY) tooBig = true
    })
    req.on('end', async () => {
      const { status, body: reply } = tooBig
        ? { status: 413, body: { error: 'The request is too large.' } }
        : await handle({
            method: req.method,
            origin: req.headers.origin,
            host: req.headers.host,
            contentType: req.headers['content-type'],
            body,
          })
      res.statusCode = status
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(reply))
    })
  }

  return {
    name: 'decidra-challenge-api',
    configureServer: (server) => void server.middlewares.use(middleware),
    configurePreviewServer: (server) => void server.middlewares.use(middleware),
  }
}
