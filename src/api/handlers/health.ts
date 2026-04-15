import { registerRoute } from '../router'

async function handleHealth(
  _request: Request,
): Promise<Response> {
  return new Response(
    JSON.stringify({ status: 'ok' }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

registerRoute('GET', '/api/v1/health', handleHealth)

export { handleHealth }
