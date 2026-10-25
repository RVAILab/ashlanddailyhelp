import { Link } from 'react-router'

export function meta() {
  return [{ title: 'Ashland Daily Help' }]
}

export default function Home() {
  return (
    <main>
      <h1>Ashland Daily Help</h1>
      <p>Food, shelter, showers and health care in Ashland and Jackson County.</p>
      <p>
        <Link to="/resources">Find help</Link>
      </p>
    </main>
  )
}
