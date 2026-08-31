import { manejador } from '../core/api/server.mjs'

export default async function handler(req, res) {
  try {
    if (req.headers['x-matched-path']) {
      req.url = req.headers['x-matched-path']
    }
    return await manejador(req, res)
  } catch (err) {
    console.error('[Vercel Serverless Error]:', err)
    if (!res.headersSent) {
      res.writeHead(500, {
        'content-type': 'application/json; charset=utf-8',
        'access-control-allow-origin': '*',
      })
      res.end(JSON.stringify({
        error: err.message,
        codigo: 'ERROR_SERVERLESS',
      }))
    }
  }
}
