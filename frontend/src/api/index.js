import api from './client'

// Auth
export const register = (data) => api.post('/auth/register/', data)
export const checkUsername = (username) => api.get('/auth/register/check-username/', { params: { username } })
export const login = (credentials) => api.post('/auth/login/', credentials)
export const logout = () => api.post('/auth/logout/')
export const getMe = () => api.get('/auth/me/')
export const forgotPassword = (email) => api.post('/auth/forgot-password/', { email })
export const resetPassword = (data) => api.post('/auth/reset-password/', data)
export const submitClientRequest = (data) => api.post('/auth/contact/', data)
export const getMitchHubDashboard = () => api.get('/mitchhub/dashboard/')
export const updateClientRequest = (id, data) => api.patch(`/mitchhub/requests/${id}/`, data)

// Sales
export const getSales = (params) => api.get('/sales/', { params })
export const createSale = (data) => api.post('/sales/', data)
export const updateSale = (id, data) => api.patch(`/sales/${id}/`, data)
export const deleteSale = (id) => api.delete(`/sales/${id}/`)

// Expenses
export const getExpenses = (params) => api.get('/expenses/', { params })
export const createExpense = (data) => api.post('/expenses/', data)
export const updateExpense = (id, data) => api.patch(`/expenses/${id}/`, data)
export const deleteExpense = (id) => api.delete(`/expenses/${id}/`)
export const getExpenseCategories = () => api.get('/expenses/categories/')

// Inventory items
export const getInventoryItems = () => api.get('/inventory/items/')
export const createInventoryItem = (data) => api.post('/inventory/items/', data)
export const getLowStockAlerts = () => api.get('/inventory/low-stock/')

// Inventory records
export const getInventoryRecords = (params) => api.get('/inventory/records/', { params })
export const createInventoryRecord = (data) => api.post('/inventory/records/', data)
export const updateInventoryRecord = (id, data) => api.patch(`/inventory/records/${id}/`, data)
export const deleteInventoryRecord = (id) => api.delete(`/inventory/records/${id}/`)

// Customers
export const getCustomers = (params) => api.get('/customers/', { params })
export const createCustomer = (data) => api.post('/customers/', data)
export const updateCustomer = (id, data) => api.patch(`/customers/${id}/`, data)
export const deleteCustomer = (id) => api.delete(`/customers/${id}/`)

// Team
export const getTeam = () => api.get('/auth/team/')
export const createTeamMember = (data) => api.post('/auth/team/', data)
export const updateTeamMember = (id, data) => api.patch(`/auth/team/${id}/`, data)
export const deleteTeamMember = (id) => api.delete(`/auth/team/${id}/`)

// POS
export const getMenuItems = (params) => api.get('/pos/menu/', { params })
export const createMenuItem = (data) => api.post('/pos/menu/', data)
export const updateMenuItem = (id, data) => api.patch(`/pos/menu/${id}/`, data)
export const deleteMenuItem = (id) => api.delete(`/pos/menu/${id}/`)
export const getTransactions = (params) => api.get('/pos/transactions/', { params })
export const createTransaction = (data) => api.post('/pos/transactions/', data)

// Health Score
export const getScoreSummary = () => api.get('/health-score/summary/')
export const getLatestScore = () => api.get('/health-score/latest/')
export const getScoreHistory = (days = 30) => api.get('/health-score/history/', { params: { days } })
export const computeScore = (date) => api.post('/health-score/compute/', { date })
export const compareModels = (date) => api.get('/health-score/compare/', { params: { date } })
