import {
  inputKey,
  mockChallenge,
  validateChallengeInput,
  type ChallengeInput,
  type ChallengeResult,
} from '../src/challenge.ts'

export type Usage = { input_tokens: number; output_tokens: number }

export type ChallengeReply = {
  result: ChallengeResult
  /** claude: a live call; cache: a previous live reply for identical input; mock: rules, no call. */
  source: 'claude' | 'cache' | 'mock'
  model?: string
  usage?: Usage
}

export type ClaudeCaller = (input: ChallengeInput) => Promise<{ result: ChallengeResult; model: string; usage: Usage }>

export type HandlerRequest = {
  method: string | undefined
  /** The Origin header. Browsers always send it on a POST; curl and tests may not. */
  origin: string | undefined
  host: string | undefined
  contentType: string | undefined
  body: string
}

export type HandlerResponse = { status: number; body: ChallengeReply | { error: string } }

// ponytail: in-memory and per dev-server process, capped at 50 entries; a restart clears it.
const CACHE_LIMIT = 50

export function createChallengeHandler(mode: 'live' | 'mock', callClaude: ClaudeCaller) {
  const cache = new Map<string, ChallengeReply>()

  return async function handle(req: HandlerRequest): Promise<HandlerResponse> {
    if (req.method !== 'POST') return { status: 405, body: { error: 'Use POST.' } }

    // A live call spends money, and any website you visit can make your browser
    // send a request to localhost. Only this app's own page may call it.
    if (req.origin !== undefined && req.origin !== `http://${req.host}`)
      return { status: 403, body: { error: 'Requests from other sites are not allowed.' } }
    // JSON also forces a CORS preflight, which cross-site pages can't pass.
    if (!req.contentType?.startsWith('application/json'))
      return { status: 415, body: { error: 'Send JSON.' } }

    let parsed: unknown
    try {
      parsed = JSON.parse(req.body)
    } catch {
      return { status: 400, body: { error: 'The request body isn’t valid JSON.' } }
    }
    const input = validateChallengeInput(parsed)
    if (!input) return { status: 400, body: { error: 'Send 1 to 3 valid features.' } }

    if (mode === 'mock') return { status: 200, body: { result: mockChallenge(input), source: 'mock' } }

    const key = inputKey(input)
    const cached = cache.get(key)
    if (cached) return { status: 200, body: { ...cached, source: 'cache' } }

    try {
      const { result, model, usage } = await callClaude(input)
      const reply: ChallengeReply = { result, source: 'claude', model, usage }
      if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!)
      cache.set(key, reply)
      return { status: 200, body: reply }
    } catch (error) {
      return { status: 502, body: { error: error instanceof Error ? error.message : 'Claude call failed.' } }
    }
  }
}
