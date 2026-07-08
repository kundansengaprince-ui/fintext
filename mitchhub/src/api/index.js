import api from './client'

export const login               = (data)     => api.post('/login/', data)
export const logout              = ()          => api.post('/logout/')
export const getMe               = ()          => api.get('/me/')
export const getMitchHubDashboard = ()         => api.get('/dashboard/')
export const updateClientRequest = (id, data) => api.patch(`/dashboard/${id}/`, data)
export const getTeam             = ()          => api.get('/team/')
export const createTeamMember    = (data)      => api.post('/team/', data)
export const updateTeamMember    = (id, data) => api.patch(`/team/${id}/`, data)
export const deleteTeamMember    = (id)        => api.delete(`/team/${id}/`)
