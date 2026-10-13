import { createRouter, createWebHistory } from 'vue-router'
import ArsenalIQView from '../views/ArsenalIQView.vue'
import PitcherProfileView from '../views/PitcherProfileView.vue'
import ChadwickView from '../views/ChadwickView.vue'
import CreditsView from '../views/CreditsView.vue'
import NotFoundView from '../views/NotFoundView.vue'

// meta.tab names the header tab that shows as active, so sub-pages such as the
// Pitcher Profile keep their parent tab lit.
export const routes = [
  { path: '/', name: 'arsenal-iq', component: ArsenalIQView, meta: { title: 'Arsenal IQ', tab: 'arsenal-iq' } },
  {
    path: '/pitchers/:playerId',
    name: 'pitcher-profile',
    component: PitcherProfileView,
    props: true,
    meta: { title: 'Pitcher Profile', tab: 'arsenal-iq' },
  },
  { path: '/chadwick', name: 'chadwick', component: ChadwickView, meta: { title: 'Chadwick', tab: 'chadwick' } },
  { path: '/credits', name: 'credits', component: CreditsView, meta: { title: 'Credits', tab: 'credits' } },
  // The host has no index.html fallback for errors, so unknown paths land here.
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView, meta: { title: 'Not found', tab: null } },
]

const router = createRouter({
  // Clean URLs: the host rewrites extensionless paths under the base to index.html.
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

export default router
