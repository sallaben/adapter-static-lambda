import { App } from './server'
import { manifest } from './manifest'

let app;
export async function handler(event) {
  if (!app) {
    app = new App(manifest)
  }
  
  const url = event.path
  const method = event.httpMethod
  const rawBody = Buffer.from(event.body)
  const headers = event.headers || {}

  const response = await app.render({
    url,
    method,
    headers, 
    rawBody
  })

  return {
    statusCode: response.status,
    headers: response.headers,
    body: response.body
  }
};
