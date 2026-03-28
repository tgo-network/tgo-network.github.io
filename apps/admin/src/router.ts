import { createRouter, createWebHistory } from "vue-router";

import { authClient } from "./lib/auth-client";
import DashboardPage from "./views/DashboardPage.vue";
import LoginPage from "./views/LoginPage.vue";
import TopicsPage from "./views/TopicsPage.vue";
import ArticlesPage from "./views/ArticlesPage.vue";
import TopicEditorPage from "./views/TopicEditorPage.vue";
import ArticleEditorPage from "./views/ArticleEditorPage.vue";
import EventsPage from "./views/EventsPage.vue";
import EventEditorPage from "./views/EventEditorPage.vue";
import EventRegistrationsPage from "./views/EventRegistrationsPage.vue";
import AuditLogsPage from "./views/AuditLogsPage.vue";
import ApplicationsPage from "./views/ApplicationsPage.vue";
import ApplicationDetailPage from "./views/ApplicationDetailPage.vue";
import AssetsPage from "./views/AssetsPage.vue";
import FeaturedBlocksPage from "./views/FeaturedBlocksPage.vue";
import RegistrationDetailPage from "./views/RegistrationDetailPage.vue";
import SiteSettingsPage from "./views/SiteSettingsPage.vue";

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
      path: "/topics",
      name: "topics",
      component: TopicsPage,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/topics/new",
      name: "topic-create",
      component: TopicEditorPage,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/topics/:id/edit",
      name: "topic-edit",
      component: TopicEditorPage,
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
      path: "/assets",
      name: "assets",
      component: AssetsPage,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/featured-blocks",
      name: "featured-blocks",
      component: FeaturedBlocksPage,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/settings/site",
      name: "site-settings",
      component: SiteSettingsPage,
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
  if (!to.meta.requiresAuth) {
    return true;
  }

  try {
    const session = await authClient.getSession();

    if (!session.data) {
      return {
        name: "login"
      };
    }
  } catch {
    return {
      name: "login"
    };
  }

  return true;
});
