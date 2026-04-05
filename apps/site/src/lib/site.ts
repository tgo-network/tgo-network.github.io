export const siteOrigin = "https://tgo.network";
export const defaultOgImagePath = "/official/about/11.a131a302.jpg";

export const toAbsoluteSiteUrl = (pathname: string) => {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return new URL(normalizedPath, siteOrigin).toString();
};
