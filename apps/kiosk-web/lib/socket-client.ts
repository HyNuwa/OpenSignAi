'use client'

import 'reflect-metadata'
import { io, Socket } from 'socket.io-client'
import { SignSocketEvents } from '@opensign/shared-types'

let socketInstance: Socket | null = null

export function getSocketClient(): Socket {
  if (!socketInstance) {
    socketInstance = io('http://localhost:4000', {
      autoConnect: false,
      transports: ['websocket'],
    })
  }
  return socketInstance
}

export function disconnectSocket() {
  socketInstance?.disconnect()
  socketInstance = null
}

export { SignSocketEvents }
