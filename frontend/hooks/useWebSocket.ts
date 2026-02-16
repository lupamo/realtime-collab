'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { WSMessage, WSMessageType } from '@/types'
import { tokenManager } from '@/lib/api'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'

interface UseWebSocketOptions {
  projectId?: number
  onMessage?: (message: WSMessage) => void
  enabled?: boolean
}

export function useWebSocket({ projectId, onMessage, enabled = true }: UseWebSocketOptions) {
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<NodeJS.Timeout>()
  const reconnectAttempts = useRef(0)
  const MAX_RECONNECT_ATTEMPTS = 5

  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null)

  const connect = useCallback(() => {
    if (!enabled) return

    const token = tokenManager.getToken()
    if (!token) return

    // Build WebSocket URL with auth token
    const wsUrl = `${WS_URL}/ws?token=${token}`
    ws.current = new WebSocket(wsUrl)

    ws.current.onopen = () => {
      console.log('WebSocket connected')
      setIsConnected(true)
      reconnectAttempts.current = 0

      // Join project room if projectId provided
      if (projectId) {
        sendMessage('join_project', { project_id: projectId })
      }
    }

    ws.current.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data)
        setLastMessage(message)
        onMessage?.(message)
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err)
      }
    }

    ws.current.onclose = () => {
      console.log('WebSocket disconnected')
      setIsConnected(false)

      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
        reconnectAttempts.current++
        reconnectTimeout.current = setTimeout(connect, delay)
      }
    }

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }, [enabled, projectId, onMessage])

  // Send message to server
  const sendMessage = useCallback((type: WSMessageType | string, data: Record<string, unknown> = {}) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type, data }))
    }
  }, [])

  const updateCursor = useCallback((x: number, y: number, taskId?: number) => {
    sendMessage('cursor_move', { x, y, task_id: taskId })
  }, [sendMessage])

  useEffect(() => {
    connect()

    return () => {
      clearTimeout(reconnectTimeout.current)
      ws.current?.close()
    }
  }, [connect])

  return { isConnected, lastMessage, sendMessage, updateCursor }
}