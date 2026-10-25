// The legacy site's mark: the sun over the valley hills, with a path down to it.
export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <circle cx="24" cy="24" r="23" className="m-ring" />
      <circle cx="31.5" cy="15.5" r="5" className="m-sun" />
      <path d="M4.5 30c6-6.5 11-9.5 16-9.5 6 0 9 5 15.5 5 3.2 0 5.7-1 7.6-2.2" className="m-hill" />
      <path d="M4.2 34.5c7.2-3.4 13.6-5 19.4-5 6.4 0 10.2 2.4 20.6 2.6" className="m-hill2" />
      <path d="M20.4 46.4c1.7-4.4 5.9-7.6 13-9.6" className="m-path" />
    </svg>
  )
}
