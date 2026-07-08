import axios from 'axios'

const api = axios.create({ baseURL: '/api/mitchhub' })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('mh_token')
  if (token) cfg.headers.Authorization = `MHToken ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('mh_token')
      localStorage.removeItem('mh_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
