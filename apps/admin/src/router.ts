import { createRouter, createWebHistory } from "vue-router";

import { authClient } from "./lib/auth-client";
import { resolveAdminRouteAccess } from "./lib/auth-guard";
import BranchEditorPage from "./views/BranchEditorPage.vue";
import BranchesPage from "./views/BranchesPage.vue";
import DashboardPage from "./views/DashboardPage.vue";
import LoginPage from "./views/LoginPage.vue";
import ArticlesPage from "./views/ArticlesPage.vue";
import ArticleEditorPage from "./views/ArticleEditorPage.vue";
import EventsPage from "./views/EventsPage.vue";
import EventEditorPage from "./views/EventEditorPage.vue";
import EventRegistrationsPage from "./views/EventRegistrationsPage.vue";
import AuditLogsPage from "./views/AuditLogsPage.vue";
import ApplicationsPage from "./views/ApplicationsPage.vue";
import ApplicationDetailPage from "./views/ApplicationDetailPage.vue";
import AssetsPage from "./views/AssetsPage.vue";
import HomepageEditorPage from "./views/HomepageEditorPage.vue";
import MemberEditorPage from "./views/MemberEditorPage.vue";
import MembersPage from "./views/MembersPage.vue";
import RegistrationDetailPage from "./views/RegistrationDetailPage.vue";
import RolesPage from "./views/RolesPage.vue";
import SitePageEditorPage from "./views/SitePageEditorPage.vue";
import StaffPage from "./views/StaffPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: "/dashboard"
    },
    {
      path: "/login",
      name: "login",
      component: LoginPage
    },
    {
      path: "/dashboard",
      name: "dashboard",
      component: DashboardPage,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/articles",
      name: "articles",
      component: ArticlesPage,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/articles/new",
      name: "article-create",
      component: ArticleEditorPage,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/articles/:id/edit",
      name: "article-edit",
      component: ArticleEditorPage,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/events",
      name: "events",
      component: EventsPage,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/events/new",
      name: "event-create",
      component: EventEditorPage,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/events/:id/edit",
      name: "event-edit",
      component: EventEditorPage,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/events/:id/registrations",
      name: "event-registrations",
      component: EventRegistrationsPage,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/registrations/:id",
      name: "registration-detail",
      component: RegistrationDetailPage,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/applications",
      name: "applications",
      component: ApplicationsPage,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/audit-logs",
      name: "audit-logs",
      component: AuditLogsPage,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/members",
      name: "members",
      component: MembersPage,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/members/new",
      name: "member-create",
      component: MemberEditorPage,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/members/:id/edit",
      name: "member-edit",
      component: MemberEditorPage,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/members/branches",
      name: "branches",
      component: BranchesPage,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/members/branches/new",
      name: "branch-create",
      component: BranchEditorPage,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/members/branches/:id/edit",
      name: "branch-edit",
      component: BranchEditorPage,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/staff",
      name: "staff",
      component: StaffPage,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/roles",
      name: "roles",
      component: RolesPage,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/assets",
      name: "assets",
      component: AssetsPage,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/site",
      redirect: "/site/homepage"
    },
    {
      path: "/site/homepage",
      name: "site-homepage",
      component: HomepageEditorPage,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/site/pages/:slug(join|about)",
      name: "site-page-edit",
      component: SitePageEditorPage,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/applications/:id",
      name: "application-detail",
      component: ApplicationDetailPage,
      meta: {
        requiresAuth: true
      }
    }
  ]
});

router.beforeEach(async (to) => {
  return resolveAdminRouteAccess(Boolean(to.meta.requiresAuth), () => authClient.getSession());
});
