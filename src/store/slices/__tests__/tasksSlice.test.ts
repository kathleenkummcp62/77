import { configureStore } from '@reduxjs/toolkit'
import { describe, it, expect, vi } from 'vitest'
import tasksReducer, { runTask } from '../tasksSlice'

interface RootState { tasks: ReturnType<typeof tasksReducer> }

describe('tasksSlice', () => {
  it('runTask updates status', async () => {
    vi.useFakeTimers()
    const store = configureStore<{tasks: ReturnType<typeof tasksReducer>}>({
      reducer: { tasks: tasksReducer }
    })
    const id = store.getState().tasks.tasks[0].id
    const promise = store.dispatch(runTask(id) as any)
    expect(store.getState().tasks.tasks[0].status).toBe('running')
    vi.runAllTimers()
    await promise
    expect(store.getState().tasks.tasks[0].status).toBe('completed')
    vi.useRealTimers()
  })
})
