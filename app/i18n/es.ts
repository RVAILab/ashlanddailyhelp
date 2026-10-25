import type { Messages } from './en.ts'

// Needs review by a Spanish speaker before launch (story 08-spanish-interface).
export const es = {
  siteName: 'Ashland Daily Help',
  language: { name: 'Español', switchTo: 'English' },
  home: {
    tagline: 'Comida, albergue, duchas y atención médica en Ashland y el condado de Jackson.',
    findHelp: 'Buscar ayuda',
  },
  categories: {
    food: 'Comida',
    housing: 'Albergue y vivienda',
    hygiene: 'Duchas e higiene',
    health: 'Atención médica',
    essentials: 'Artículos básicos',
  },
  areas: {
    countyWide: area =>
      area === 'Jackson County' ? 'Condado de Jackson (todo el condado)' : `${area} (todo el condado)`,
    statewide: area => (area === 'Oregon' ? 'Oregón (todo el estado)' : `${area} (todo el estado)`),
  },
  search: {
    title: 'Buscar ayuda',
    pageTitle: query => (query ? `${query} · Buscar ayuda` : 'Buscar ayuda · Ashland Daily Help'),
    words: 'Palabras para buscar',
    kind: 'Tipo de ayuda',
    anyKind: 'Todo tipo de ayuda',
    area: 'Zona',
    anyArea: 'Todas las zonas',
    submit: 'Buscar',
    results: 'Resultados',
    places: count => (count === 0 ? 'Ningún lugar coincide' : count === 1 ? '1 lugar' : `${count} lugares`),
    tryFewer: 'Pruebe con menos palabras, o con otro tipo de ayuda u otra zona. También puede',
    clear: 'borrar la búsqueda',
    help211: 'Para encontrar ayuda, llame al 211.',
    noneListed: 'No hay lugares en la lista en este momento. Para encontrar ayuda, llame al 211.',
    notLoaded: 'Los servicios todavía no se han cargado. Para encontrar ayuda ahora, llame al 211.',
    call211: 'Llamar al 211',
  },
  card: {
    kind: 'Tipo de ayuda',
    area: 'Zona',
    when: 'Cuándo',
    where: 'Dónde',
    phone: 'Teléfono',
    noPhone: 'No confirmado',
  },
  labels: {
    conflict: 'Hay que confirmar el horario',
    unconfirmed: 'Todavía no confirmado por el proveedor',
    fictional: 'Ejemplo ficticio',
    ends: when => `Termina ${when}`,
    sourceReviewed: day => `Fuente revisada · ${day}`,
    lastConfirmed: day => `Confirmado por última vez el ${day}`,
  },
  feed: {
    asOf: 'Servicios actualizados al',
    updateFailing: 'No se pudo cargar la última actualización, así que esta información podría no estar al día.',
    demonstration: 'Estos son datos de demostración. Algunos servicios son ficticios.',
    none: 'Los servicios todavía no se han cargado.',
    unavailable: 'Los servicios no están disponibles en este momento. Para encontrar ayuda, llame al',
  },
  errors: {
    notFound: 'No se encontró la página',
    notFoundDetail: 'No hay ninguna página en esta dirección.',
    failed: 'Algo salió mal',
    failedDetail: 'Inténtelo de nuevo.',
    home: 'Ir a la página principal',
    call211: 'Para encontrar ayuda, llame al',
  },
} satisfies Messages
