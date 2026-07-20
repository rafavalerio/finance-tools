import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useHousehold } from './useHousehold'

beforeEach(() => {
  localStorage.clear()
})

describe('useHousehold', () => {
  it('starts empty and loaded is false until localStorage has been read', async () => {
    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.members).toEqual([])
  })

  it('loads saved members from localStorage on mount', async () => {
    localStorage.setItem(
      'finance-tools-household',
      JSON.stringify([{ id: '1', name: 'Rafael', income: 95000 }]),
    )
    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.members).toHaveLength(1))
    expect(result.current.members[0].name).toBe('Rafael')
  })

  it('appends a blank member when addMember is called', async () => {
    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    act(() => {
      result.current.addMember()
    })

    expect(result.current.members).toHaveLength(1)
    expect(result.current.members[0]).toMatchObject({ name: '', income: 0 })
  })

  it('updates a member by id', async () => {
    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    act(() => {
      result.current.addMember()
    })
    const added = result.current.members[0]

    act(() => {
      result.current.updateMember({ ...added, name: 'Rafael', income: 95000 })
    })

    expect(result.current.members[0]).toEqual({ ...added, name: 'Rafael', income: 95000 })
  })

  it('removes a member by id', async () => {
    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    act(() => {
      result.current.addMember()
    })
    const added = result.current.members[0]

    act(() => {
      result.current.removeMember(added.id)
    })

    expect(result.current.members).toEqual([])
  })

  it('persists changes to localStorage', async () => {
    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    act(() => {
      result.current.addMember()
    })

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('finance-tools-household') || '[]')
      expect(stored).toHaveLength(1)
    })
  })

  it('syncs across multiple mounted instances when one instance saves a change', async () => {
    const first = renderHook(() => useHousehold())
    const second = renderHook(() => useHousehold())

    await waitFor(() => expect(first.result.current.isLoaded).toBe(true))
    await waitFor(() => expect(second.result.current.isLoaded).toBe(true))

    act(() => {
      first.result.current.addMember()
    })

    await waitFor(() => expect(second.result.current.members).toHaveLength(1))
  })
})
