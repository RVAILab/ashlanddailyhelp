import { index, type RouteConfig, route } from '@react-router/dev/routes'

export default [
  route('health', 'routes/health.ts'),
  route('language', 'routes/language.ts'),
  route('text', 'routes/text.ts'),
  route('forget', 'routes/forget.ts'),
  route('list/toggle', 'routes/list-toggle.ts'),
  route('list/save', 'routes/list-save.ts'),
  route('offline-pages.json', 'routes/offline-pages.ts'),
  route('es?', 'routes/locale.tsx', [
    index('routes/home.tsx'),
    route('resources', 'routes/resources.tsx'),
    route('resources/:id', 'routes/resource.tsx'),
    route('about', 'routes/about.tsx'),
    route('today', 'routes/today.tsx'),
    route('next', 'routes/next.tsx'),
    route('providers', 'routes/providers.tsx'),
    route('report', 'routes/report.tsx'),
    route('list', 'routes/list.tsx'),
    route('print', 'routes/print.tsx'),
    route('*', 'routes/not-found.tsx'),
  ]),
] satisfies RouteConfig
