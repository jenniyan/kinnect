// services/socket.js
// Two Socket.io connections:
//   gatewaySocket — location updates + routing notifications (port 3000)
//   chatSocket    — messages, read receipts, chat transfer (port 3004)

import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from './api';

const CHAT_URL = BASE_URL.replace(':3000', ':3004');

let gatewaySocket = null;
let chatSocket    = null;

// ── Gateway socket (location + routing) ──────────────────────
export async function connectGateway() {
  if (gatewaySocket?.connected) return gatewaySocket;
  const token = await AsyncStorage.getItem('token');
  gatewaySocket = io(BASE_URL, {
    auth:            { token },
    transports:      ['websocket'],
    reconnection:    true,
    reconnectionDelay: 1000,
  });
  gatewaySocket.on('connect',    () => console.log('[gateway ws] connected'));
  gatewaySocket.on('disconnect', () => console.log('[gateway ws] disconnected'));
  gatewaySocket.on('connect_error', (e) => console.warn('[gateway ws]', e.message));
  return gatewaySocket;
}

export function getGatewaySocket() { return gatewaySocket; }

export function disconnectGateway() {
  gatewaySocket?.disconnect();
  gatewaySocket = null;
}

// ── Chat socket ───────────────────────────────────────────────
export async function connectChat(userId) {
  if (chatSocket?.connected) return chatSocket;
  chatSocket = io(CHAT_URL, {
    query:        { user_id: userId },
    transports:   ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
  });
  chatSocket.on('connect',    () => console.log('[chat ws] connected'));
  chatSocket.on('disconnect', () => console.log('[chat ws] disconnected'));
  chatSocket.on('connect_error', (e) => console.warn('[chat ws]', e.message));
  return chatSocket;
}

export function getChatSocket() { return chatSocket; }

export function disconnectChat() {
  chatSocket?.disconnect();
  chatSocket = null;
}

export function disconnectAll() {
  disconnectGateway();
  disconnectChat();
}
