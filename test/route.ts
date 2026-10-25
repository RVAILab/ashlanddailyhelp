import { type LoaderFunctionArgs, RouterContextProvider } from 'react-router'
import { type AppServices, services } from '../app/context.ts'

export function loaderArgs(url: string, provided: Partial<AppServices> = {}): LoaderFunctionArgs {
  const context = new RouterContextProvider()
  context.set(services, { database: () => null, ...provided })
  const request = new Request(new URL(url, 'http://localhost'))
  return { request, url: new URL(request.url), params: {}, context, pattern: '' } as unknown as LoaderFunctionArgs
}
