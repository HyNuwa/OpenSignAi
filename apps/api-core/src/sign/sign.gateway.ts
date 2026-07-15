import { Logger } from '@nestjs/common'
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { SignSocketEvents, LandmarksMessageDto } from '@opensign/shared-types'
import { SignService } from './sign.service'

@WebSocketGateway({
  cors: { origin: 'http://localhost:3000', credentials: true },
  namespace: '/',
})
export class SignGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(SignGateway.name)

  @WebSocketServer()
  server!: Server

  constructor(private readonly signService: SignService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`)
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`)
  }

  @SubscribeMessage(SignSocketEvents.JOIN_KIOSK)
  handleJoin(
    @MessageBody() data: { kioskId: string },
    @ConnectedSocket() client: Socket,
  ) {
    void client.join(data.kioskId)
    return { event: SignSocketEvents.JOIN_KIOSK, data: { ok: true } }
  }

  @SubscribeMessage(SignSocketEvents.LEAVE_KIOSK)
  handleLeave(
    @MessageBody() data: { kioskId: string },
    @ConnectedSocket() client: Socket,
  ) {
    void client.leave(data.kioskId)
    return { event: SignSocketEvents.LEAVE_KIOSK, data: { ok: true } }
  }

  @SubscribeMessage(SignSocketEvents.LANDMARKS)
  async handleLandmarks(
    @MessageBody() message: LandmarksMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const interpretation = await this.signService.interpret(message.payload)

    this.server.to(message.kioskId).emit(SignSocketEvents.INTERPRETATION, {
      text: interpretation.text,
      confidence: interpretation.confidence,
      gloss: interpretation.gloss,
    })

    return { event: SignSocketEvents.INTERPRETATION, data: interpretation }
  }
}
