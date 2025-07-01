import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import scannerReducer from '../../store/slices/scannerSlice'
import { useWebSocket } from '../useWebSocket'

class MockWebSocket {
  static OPEN = 1
  public sent: string[] = []
  readyState = MockWebSocket.OPEN
  onopen: (() => void) | null = null
  constructor(public url: string) {
    ;(globalThis as any).lastSocket = this
    setTimeout(() => this.onopen && this.onopen(), 0)
  }
  send(data: string) { this.sent.push(data) }
  close() {}
}

describe('useWebSocket', () => {
  it('sends start and stop commands', () => {
    vi.useFakeTimers()
    ;(global as any).WebSocket = MockWebSocket as any
    const store = configureStore({ reducer: { scanner: scannerReducer } })
    const wrapper = ({ children }: any) => <Provider store={store}>{children}</Provider>
    const { result } = renderHook(() => useWebSocket('ws://test'), { wrapper })
    vi.runAllTimers()
    const socket: any = (global as any).lastSocket

    act(() => { result.current.startScanner('fortinet') })
    act(() => { result.current.stopScanner('fortinet') })

    const msgs = socket.sent.map((m: string) => JSON.parse(m).type)
    expect(msgs).toEqual(['start_scanner', 'stop_scanner'])
    vi.useRealTimers()
  })
})
