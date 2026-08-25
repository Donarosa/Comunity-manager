import { manejador } from '../core/api/server.mjs'

export default async function handler(req, res) {
  return manejador(req, res)
}
