import { describe, expect, it } from 'vitest'
import { loaderArgs } from '../../test/route.ts'
import { loader } from './list-save.ts'

describe('/list/save', () => {
  it('adds a shared list to what is already saved, without repeats', () => {
    const response = loader(
      loaderArgs('https://ashlanddailyhelp.com/list/save?ids=a-1.b-2', {}, { Cookie: 'saved=b-2.c-3' }),
    )
    expect(response.headers.get('Location')).toBe('/list')
    expect(response.headers.get('Set-Cookie')).toContain('saved=b-2.c-3.a-1;')
  })

  it('changes nothing when another website sends someone here', () => {
    const response = loader(
      loaderArgs('https://ashlanddailyhelp.com/list/save?ids=a-1', {}, { 'Sec-Fetch-Site': 'cross-site' }),
    )
    expect(response.headers.get('Set-Cookie')).toBeNull()
  })
})
