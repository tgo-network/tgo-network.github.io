import { listArticles, listEvents, listMembers } from "../lib/public-api.js";
import { toAbsoluteSiteUrl } from "../lib/site.js";

export const prerender = true;

const staticRoutes = ["/", "/branches", "/members", "/events", "/articles", "/about", "/faq", "/join", "/privacy", "/terms"];

const toDirectoryPath = (path: string) => {
  if (path === "/") {
    return path;
  }

  return `${path.replace(/\/+$/u, "")}/`;
};

const createUrlEntry = (path: string) => `<url><loc>${toAbsoluteSiteUrl(toDirectoryPath(path))}</loc></url>`;

export const GET = async () => {
  const [members, events, articles] = await Promise.all([listMembers(), listEvents(), listArticles()]);
  const detailRoutes = [
    ...members.map((member) => `/members/${member.slug}`),
    ...events.map((event) => `/events/${event.slug}`),
    ...articles.map((article) => `/articles/${article.slug}`)
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticRoutes, ...detailRoutes].map(createUrlEntry).join("\n")}
</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8"
    }
  });
};
