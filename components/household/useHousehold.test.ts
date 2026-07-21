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

  it('starts with an empty split config until loaded', async () => {
    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.splitConfig).toEqual({ memberIds: [], mode: 'even' })
  })

  it('loads a saved split config from localStorage on mount', async () => {
    localStorage.setItem(
      'finance-tools-household-split',
      JSON.stringify({ memberIds: ['1'], mode: 'income' }),
    )
    const { result } = renderHook(() => useHousehold())
    await waitFor(() =>
      expect(result.current.splitConfig).toEqual({ memberIds: ['1'], mode: 'income' }),
    )
  })

  it('toggles a member in and out of the split', async () => {
    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    act(() => {
      result.current.toggleSplitMember('1', true)
    })
    expect(result.current.splitConfig.memberIds).toEqual(['1'])

    act(() => {
      result.current.toggleSplitMember('1', false)
    })
    expect(result.current.splitConfig.memberIds).toEqual([])
  })

  it('sets the split mode', async () => {
    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    act(() => {
      result.current.setSplitMode('income')
    })
    expect(result.current.splitConfig.mode).toBe('income')
  })

  it('persists split config changes to localStorage', async () => {
    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    act(() => {
      result.current.toggleSplitMember('1', true)
    })

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('finance-tools-household-split') || '{}')
      expect(stored.memberIds).toEqual(['1'])
    })
  })

  it('auto-selects every member once there are 2+ and split config has never been saved', async () => {
    localStorage.setItem(
      'finance-tools-household',
      JSON.stringify([
        { id: 'a', name: 'Alex', income: 100000 },
        { id: 'b', name: 'Sam', income: 50000 },
      ]),
    )
    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.splitConfig.memberIds).toEqual(['a', 'b']))
  })

  it('does not re-seed the split after a previously saved config, even an empty one', async () => {
    localStorage.setItem(
      'finance-tools-household',
      JSON.stringify([
        { id: 'a', name: 'Alex', income: 100000 },
        { id: 'b', name: 'Sam', income: 50000 },
      ]),
    )
    localStorage.setItem(
      'finance-tools-household-split',
      JSON.stringify({ memberIds: [], mode: 'even' }),
    )
    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.splitConfig.memberIds).toEqual([])
  })

  it('seeds the split config correctly even when adding members triggers a concurrent reload', async () => {
    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    act(() => {
      result.current.addMember()
    })
    act(() => {
      result.current.addMember()
    })

    await waitFor(() => expect(result.current.members).toHaveLength(2))
    await waitFor(() => expect(result.current.splitConfig.memberIds).toHaveLength(2))
    expect(result.current.splitConfig.memberIds).toEqual(result.current.members.map((m) => m.id))

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('finance-tools-household-split') || '{}')
      expect(stored.memberIds).toHaveLength(2)
    })
  })

  it('persists the auto-seeded split config even when nothing was ever saved before mount', async () => {
    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    act(() => {
      result.current.addMember()
    })
    act(() => {
      result.current.addMember()
    })

    await waitFor(() => expect(result.current.splitConfig.memberIds).toHaveLength(2))

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('finance-tools-household-split') || 'null')
      expect(stored).not.toBeNull()
      expect(stored.memberIds).toHaveLength(2)
    })
  })
})
