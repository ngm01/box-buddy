const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('src/pages/BoxListPage.vue') },
      { path: '/boxes', component: () => import('src/pages/BoxListPage.vue') },
      {
        path: '/boxes/:id',
        component: () => import('src/pages/BoxDetailPage.vue'),
      },
      {
        path: '/boxes/:display_name/:box_name',
        component: () => import('src/pages/BoxDetailPage.vue'),
      },
      {
        path: '/settings/billing',
        component: () => import('src/pages/settings/BillingSettingsPage.vue'),
      },
    ],
    meta: { requiresAuth: true },
  },
  {
    path: '/login',
    component: () => import('pages/LoginPage.vue'),
  },
  {
    path: '/signup',
    component: () => import('pages/SignUpPage.vue'),
  },
  {
    path: '/signup-success',
    component: () => import('pages/SignUpSuccessPage.vue'),
  },

  {
    path: '/forgot-password',
    component: () => import('pages/ForgotPasswordPage.vue'),
  },
  {
    path: '/reset-password',
    component: () => import('pages/ResetPasswordPage.vue'),
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
