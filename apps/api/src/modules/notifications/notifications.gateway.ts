import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
} from "@nestjs/websockets";
import { Server } from "socket.io";

@WebSocketGateway()
export class NotificationsGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage("sendNotification")
  handleSendNotification(client: any, payload: { message: string }): void {
    this.server.emit("notification", payload);
  }

  @SubscribeMessage("disconnect")
  handleDisconnect(client: any): void {
    console.log(`Client disconnected: ${client.id}`);
  }
}
