import Anthropic from '@anthropic-ai/sdk'
import { challengeSchema, parseChallenge, SYSTEM_PROMPT, userPrompt } from '../src/challenge.ts'
import type { ClaudeCaller } from './challenge-handler.ts'

export const MODEL = 'claude-opus-5-5'

/**
 * Credentials resolve server-side only: the key from .env.local if set, otherwise
 * the SDK's own chain (ANTHROPIC_API_KEY, then an `ant auth login` profile).
 * The client is created on first use, so a missing key can't stop the dev server.
 */
export function makeClaudeCaller(apiKey: string | undefined): ClaudeCaller {
  let client: Anthropic | undefined

  return async (input) => {
    try {
      client ??= new Anthropic(apiKey ? { apiKey } : {})
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        // If a safety classifier declines, the API retries on the model it recommends.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: {
          // Medium is this model's default; set explicitly so a default change can't raise the bill.
          effort: 'medium',
          format: { type: 'json_schema', schema: challengeSchema },
        },
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt(input) }],
      })

      if (response.stop_reason === 'refusal')
        throw new Error('Claude declined to review this backlog. Try rewording the feature notes.')
      if (response.stop_reason === 'max_tokens')
        throw new Error('Claude’s reply was cut off before it finished. Try again.')

      const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
      let data: unknown
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error('Claude’s reply wasn’t valid JSON.')
      }
      const result = parseChallenge(data, input)
      if (!result) throw new Error('Claude’s reply didn’t match the features that were sent.')

      const usage = { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens }
      console.log(`[decidra] challenge: ${response.model}, ${usage.input_tokens} in / ${usage.output_tokens} out tokens`)
      return { result, model: response.model, usage }
    } catch (error) {
      throw new Error(friendly(error))
    }
  }
}

/** Plain-English errors for the page. API messages carry no secrets. */
function friendly(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError)
    return 'Claude rejected the credentials. Check ANTHROPIC_API_KEY in .env.local, or run `ant auth login`.'
  if (error instanceof Anthropic.PermissionDeniedError)
    return 'This API key isn’t allowed to use that model.'
  if (error instanceof Anthropic.RateLimitError) return 'Claude is rate-limiting requests. Wait a minute and try again.'
  if (error instanceof Anthropic.BadRequestError) return `Claude rejected the request: ${error.message}`
  if (error instanceof Anthropic.APIConnectionError) return 'Couldn’t reach Claude. Check your internet connection.'
  if (error instanceof Anthropic.APIError) return `Claude API error ${error.status}: ${error.message}`
  if (error instanceof Error) return error.message
  return 'Claude call failed.'
}
