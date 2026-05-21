// services/api.js
// All calls go through the API Gateway at PORT 3000.
// Change BASE_URL to your server's IP when testing on a real device.

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️  Change this to your machine's local IP when running on a real device
// e.g. 'http://192.168.1.42:3000'
// For Expo Go on simulator, localhost works fine.
export const BASE_URL = 'http://localhost:3000';

const api = axios.create({ baseURL: BASE_URL });

// Attach JWT to every request automatically
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ──────────────────────────────────────────────────────
export const register = (body) => api.post('/auth/register', body);
export const login    = (body) => api.post('/auth/login', body);

// ── Profile ───────────────────────────────────────────────────
export const getMe           = ()     => api.get('/users/me');
export const updateProfile   = (body) => api.patch('/users/me/profile', body);
export const getUserById     = (id)   => api.get(`/users/${id}`);

// ── Tags ──────────────────────────────────────────────────────
export const getTags         = (params) => api.get('/tags', { params });
export const getCategories   = ()        => api.get('/tags/categories');
export const createTag       = (body)    => api.post('/tags', body);
export const resolveTags     = (names)   => api.post('/tags/resolve', { names });
export const addUserTags     = (tagIds)  => api.post('/users/me/tags', { tag_ids: tagIds });
export const removeUserTag   = (tagId)   => api.delete(`/users/me/tags/${tagId}`);
export const getUserTags     = (userId)  => api.get(`/tags/user/${userId}`);

// ── Location ──────────────────────────────────────────────────
export const updateLocation  = (lat, lng) => api.post('/location/update', { lat, lng });
export const getNearbyUsers  = (params)   => api.get('/users/nearby', { params });
export const hideLocation    = ()          => api.delete('/location/hide');

// ── Blocks ────────────────────────────────────────────────────
export const getBlocks       = ()     => api.get('/users/me/blocks');
export const blockUser       = (id)   => api.post(`/users/me/blocks/${id}`);
export const unblockUser     = (id)   => api.delete(`/users/me/blocks/${id}`);

// ── External Accounts ─────────────────────────────────────────
export const getMyExternal      = ()                    => api.get('/users/me/external');
export const saveExternalHandle = (platform, handle)    => api.put(`/users/me/external/${platform}`, { handle });
export const deleteExternal     = (platform)            => api.delete(`/users/me/external/${platform}`);
export const getUserExternal    = (userId)              => api.get(`/users/${userId}/external`);

// ── Rooms / Chat ──────────────────────────────────────────────
export const createRoom      = (body) => api.post('/rooms', body);
export const getRooms        = ()     => api.get('/rooms');
export const getRoom         = (id)   => api.get(`/rooms/${id}`);
export const getMessages     = (roomId, params) => api.get(`/rooms/${roomId}/messages`, { params });
export const addRoomMember   = (roomId, userId) => api.post(`/rooms/${roomId}/members`, { user_id: userId });

// ── Navigation ────────────────────────────────────────────────
export const getRoute            = (body) => api.post('/navigation/route', body);
export const getRouteBetweenUsers= (body) => api.post('/navigation/route-between-users', body);
export const createRoutingRequest= (targetId) => api.post('/routing-requests', { target_id: targetId });
export const updateRoutingRequest= (id, status) => api.patch(`/routing-requests/${id}`, { status });

// ── Videos ───────────────────────────────────────────────────
export const getUploadUrl    = (body)    => api.post('/media/upload-url', body);
export const confirmUpload   = (body)    => api.post('/media/confirm', body);
export const getVideoUrl     = (id)      => api.get(`/media/${id}/url`);
export const getNearbyVideos = (params)  => api.get('/videos/nearby', { params });
export const getUserVideos   = (userId)  => api.get(`/videos/user/${userId}`);
export const getVideo        = (id)      => api.get(`/videos/${id}`);
export const likeVideo       = (id)      => api.post(`/videos/${id}/like`);
export const unlikeVideo     = (id)      => api.delete(`/videos/${id}/like`);
export const deleteVideo     = (id)      => api.delete(`/videos/${id}`);
export const updateVideo     = (id, body)=> api.patch(`/videos/${id}`, body);

export default api;
