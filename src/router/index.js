import { defineRouter } from '#q-app/wrappers'
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from 'vue-router'
import { useAuthStore } from 'src/stores/auth.store'
import routes from './routes'

export default defineRouter(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  })

  Router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()
    const valid = await authStore.hasValidSession()

    if (to.meta.requiresAuth && !valid) {
      next({ path: '/login', query: { redirect: to.fullPath } })
      return
    }

    if (to.path === '/login' && valid) {
      next('/')
      return
    }

    next()
  })

  return Router
})
