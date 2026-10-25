import { type LoaderFunctionArgs, RouterContextProvider } from 'react-router'
import { type AppServices, services } from '../app/context.ts'

export function loaderArgs(
  path: string,
  provided: Partial<AppServices> = {},
  headers: HeadersInit = {},
): LoaderFunctionArgs {
  const context = new RouterContextProvider()
  context.set(services, { database: () => null, ...provided })
  const url = new URL(path, 'http://localhost')
  return { request: new Request(url, { headers }), url, pattern: url.pathname, params: {}, context }
}
