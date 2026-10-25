import { index, type RouteConfig, route } from '@react-router/dev/routes'

export default [
  route('health', 'routes/health.ts'),
  route('language', 'routes/language.ts'),
  route('forget', 'routes/forget.ts'),
  route('offline-pages.json', 'routes/offline-pages.ts'),
  route('es?', 'routes/locale.tsx', [
    index('routes/home.tsx'),
    route('resources', 'routes/resources.tsx'),
    route('resources/:id', 'routes/resource.tsx'),
    route('about', 'routes/about.tsx'),
    route('today', 'routes/today.tsx'),
    route('*', 'routes/not-found.tsx'),
  ]),
] satisfies RouteConfig
