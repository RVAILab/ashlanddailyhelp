import { data } from 'react-router'

export function loader() {
  return data(null, { status: 404 })
}

export function meta() {
  return [{ title: 'Page not found · Ashland Daily Help' }]
}

export default function NotFound() {
  return (
    <main>
      <h1>Page not found</h1>
      <p>
        There is no page at this address. <a href="/">Go to the homepage</a>.
      </p>
    </main>
  )
}
