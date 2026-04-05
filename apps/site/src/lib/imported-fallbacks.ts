import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type {
  BranchDetail,
  BranchReference,
  PublicImageAsset,
  MemberDetail,
  MemberSummary,
  PublicEventDetailV2,
  PublicEventSummaryV2,
  PublicHomePayloadV2
} from "@tgo/shared";
import { publicHomePayloadV2 } from "@tgo/shared";

interface ImportedImageRef {
  sourceUrl: string | null;
  localPath: string | null;
}

interface ImportedBranchBoardMember {
  displayName: string;
  company: string;
  organizationRole: string;
  jobTitle: string;
  bio: string;
  avatar: ImportedImageRef | null;
}

interface ImportedBranch {
  slug: string;
  name: string;
  cityName: string;
  region: string;
  summary: string;
  body: string;
  coverImage: ImportedImageRef | null;
  boardMembers: ImportedBranchBoardMember[];
}

interface ImportedMember {
  slug: string;
  name: string;
  cityName: string;
  branchSlug: string | null;
  company: string;
  title: string;
  joinedAt: string | null;
  bio: string;
}

interface ImportedEventAgendaItem {
  time: string;
  title: string;
  speaker: string;
  summary: string;
}

interface ImportedEvent {
  slug: string;
  title: string;
  summary: string;
  body: string;
  startsAt: string | null;
  endsAt: string | null;
  cityName: string;
  venueName: string;
  venueAddress: string;
  primaryBranchSlug: string | null;
  registrationState: "not_open" | "open" | "waitlist" | "closed";
  registrationUrl: string | null;
  coverImage: ImportedImageRef | null;
  agenda: ImportedEventAgendaItem[];
}

interface BranchImportPayload {
  branches: ImportedBranch[];
}

interface MemberImportPayload {
  members: ImportedMember[];
}

interface EventImportPayload {
  events: ImportedEvent[];
}

interface ImportedMemberFallback {
  summaries: MemberSummary[];
  detailsBySlug: Map<string, MemberDetail>;
}

interface ImportedEventFallback {
  summaries: PublicEventSummaryV2[];
  detailsBySlug: Map<string, PublicEventDetailV2>;
}

const repoMarker = "pnpm-workspace.yaml";
let repoRootCache: string | null | undefined;
let branchFallbackPromise: Promise<BranchDetail[] | null> | null = null;
let memberFallbackPromise: Promise<ImportedMemberFallback | null> | null = null;
let eventFallbackPromise: Promise<ImportedEventFallback | null> | null = null;
let homeFallbackPromise: Promise<PublicHomePayloadV2 | null> | null = null;
const mirroredAssetExistsCache = new Map<string, boolean>();

const findRepoRoot = () => {
  if (repoRootCache !== undefined) {
    return repoRootCache;
  }

  let currentDir = process.cwd();

  while (true) {
    if (existsSync(path.join(currentDir, repoMarker))) {
      repoRootCache = currentDir;
      return repoRootCache;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      repoRootCache = null;
      return repoRootCache;
    }

    currentDir = parentDir;
  }
};

const readRepoJson = async <T>(...segments: string[]): Promise<T | null> => {
  const repoRoot = findRepoRoot();

  if (!repoRoot) {
    return null;
  }

  try {
    const filePath = path.join(repoRoot, ...segments);
    return JSON.parse(await readFile(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
};

const normalizeImportedSourceUrl = (sourceUrl: string | null | undefined) => {
  const normalized = sourceUrl?.trim();

  if (!normalized) {
    return null;
  }

  // GitHub Pages cannot serve our ignored imported binaries, so imported assets
  // should resolve to a stable remote URL or a tracked mirror path.
  if (normalized.startsWith("http://cdn001.geekbang.org/")) {
    return null;
  }

  if (normalized.startsWith("http://")) {
    return `https://${normalized.slice("http://".length)}`;
  }

  return normalized;
};

const hasMirroredAsset = (publicPath: string) => {
  const cached = mirroredAssetExistsCache.get(publicPath);

  if (cached !== undefined) {
    return cached;
  }

  const repoRoot = findRepoRoot();

  if (!repoRoot) {
    mirroredAssetExistsCache.set(publicPath, false);
    return false;
  }

  const exists = existsSync(path.join(repoRoot, "apps", "site", "public", publicPath.replace(/^\//u, "")));
  mirroredAssetExistsCache.set(publicPath, exists);
  return exists;
};

const toMirroredImportedPath = (localPath: string | null | undefined) => {
  const normalized = localPath?.trim();

  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("/imports/tgo-infoq/")) {
    const mirroredPath = normalized.replace("/imports/tgo-infoq/", "/mirrors/tgo-infoq/").replace(/\.[^.\/]+$/u, ".webp");
    return hasMirroredAsset(mirroredPath) ? mirroredPath : null;
  }

  return normalized;
};

const resolveImportedImageUrl = (image: ImportedImageRef | null) => {
  const localPath = image?.localPath?.trim() ?? null;
  const mirroredPath = toMirroredImportedPath(localPath);

  if (mirroredPath) {
    return mirroredPath;
  }

  if (localPath?.startsWith("/imports/tgo-infoq/")) {
    return null;
  }

  return normalizeImportedSourceUrl(image?.sourceUrl);
};

const toImageAsset = (image: ImportedImageRef | null, alt: string): PublicImageAsset | null => {
  const url = resolveImportedImageUrl(image);

  if (!url) {
    return null;
  }

  return {
    url,
    alt,
    width: null,
    height: null
  };
};

const toBranchReference = (branch: Pick<BranchReference, "slug" | "name" | "cityName">): BranchReference => ({
  slug: branch.slug,
  name: branch.name,
  cityName: branch.cityName
});

const sortEventSummaries = (events: PublicEventSummaryV2[]) =>
  [...events].sort((left, right) => {
    const leftTime = Date.parse(left.startsAt);
    const rightTime = Date.parse(right.startsAt);

    if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) {
      return left.title.localeCompare(right.title, "zh-CN");
    }

    if (Number.isNaN(leftTime)) {
      return 1;
    }

    if (Number.isNaN(rightTime)) {
      return -1;
    }

    return rightTime - leftTime || left.title.localeCompare(right.title, "zh-CN");
  });

const loadImportedBranches = async (): Promise<BranchDetail[] | null> => {
  if (!branchFallbackPromise) {
    branchFallbackPromise = readRepoJson<BranchImportPayload>("data", "imports", "tgo-infoq", "branches.json").then((payload) => {
      if (!payload?.branches?.length) {
        return null;
      }

      return payload.branches.map((branch) => ({
        slug: branch.slug,
        name: branch.name,
        cityName: branch.cityName,
        region: branch.region,
        summary: branch.summary,
        boardMemberCount: branch.boardMembers.length,
        coverImage: toImageAsset(branch.coverImage, `${branch.name}封面`),
        body: branch.body,
        boardMembers: branch.boardMembers.map((member) => ({
          displayName: member.displayName,
          company: member.company,
          title: member.organizationRole,
          bio: member.bio || member.jobTitle || member.organizationRole,
          avatar: toImageAsset(member.avatar, `${member.displayName}头像`)
        }))
      }));
    });
  }

  return branchFallbackPromise;
};

const loadImportedMembers = async (): Promise<ImportedMemberFallback | null> => {
  if (!memberFallbackPromise) {
    memberFallbackPromise = Promise.all([
      readRepoJson<MemberImportPayload>("data", "imports", "tgo-members", "members.json"),
      loadImportedBranches()
    ]).then(([payload, branches]) => {
      if (!payload?.members?.length) {
        return null;
      }

      const branchReferences = branches?.map((branch) => toBranchReference(branch)) ?? [];
      const branchBySlug = new Map(branchReferences.map((branch) => [branch.slug, branch]));
      const branchByCityName = new Map(branchReferences.map((branch) => [branch.cityName, branch]));
      const summaries = payload.members.map<MemberSummary>((member) => ({
        slug: member.slug,
        name: member.name,
        company: member.company,
        title: member.title,
        avatar: null,
        branch: member.branchSlug
          ? branchBySlug.get(member.branchSlug) ?? branchByCityName.get(member.cityName) ?? null
          : branchByCityName.get(member.cityName) ?? null,
        joinedAt: member.joinedAt ?? ""
      }));
      const detailsBySlug = new Map(
        payload.members.map((member) => {
          const summary = summaries.find((item) => item.slug === member.slug);
          const detail: MemberDetail = {
            ...(summary ?? {
              slug: member.slug,
              name: member.name,
              company: member.company,
              title: member.title,
              avatar: null,
              branch: null,
              joinedAt: member.joinedAt ?? ""
            }),
            bio: member.bio || `${member.name}是 TGO 鲲鹏会成员。`
          };

          return [member.slug, detail] as const;
        })
      );

      return {
        summaries,
        detailsBySlug
      };
    });
  }

  return memberFallbackPromise;
};

const loadImportedEvents = async (): Promise<ImportedEventFallback | null> => {
  if (!eventFallbackPromise) {
    eventFallbackPromise = Promise.all([
      readRepoJson<EventImportPayload>("data", "imports", "tgo-infoq", "events.json"),
      loadImportedBranches()
    ]).then(([payload, branches]) => {
      if (!payload?.events?.length) {
        return null;
      }

      const branchReferences = branches?.map((branch) => toBranchReference(branch)) ?? [];
      const branchBySlug = new Map(branchReferences.map((branch) => [branch.slug, branch]));
      const branchByCityName = new Map(branchReferences.map((branch) => [branch.cityName, branch]));
      const summaries = payload.events.map<PublicEventSummaryV2>((event) => ({
        slug: event.slug,
        title: event.title,
        summary: event.summary,
        startsAt: event.startsAt ?? "",
        endsAt: event.endsAt ?? event.startsAt ?? "",
        cityName: event.cityName,
        venueName: event.venueName,
        venueAddress: event.venueAddress,
        coverImage: toImageAsset(event.coverImage, `${event.title}封面`),
        registrationUrl: event.registrationUrl,
        branch: event.primaryBranchSlug
          ? branchBySlug.get(event.primaryBranchSlug) ?? branchByCityName.get(event.cityName) ?? null
          : branchByCityName.get(event.cityName) ?? null,
        registrationState: event.registrationState
      }));
      const detailsBySlug = new Map(
        payload.events.map((event) => {
          const summary = summaries.find((item) => item.slug === event.slug);
          const detail: PublicEventDetailV2 = {
            ...(summary ?? {
              slug: event.slug,
              title: event.title,
              summary: event.summary,
              startsAt: event.startsAt ?? "",
              endsAt: event.endsAt ?? event.startsAt ?? "",
              cityName: event.cityName,
              venueName: event.venueName,
              venueAddress: event.venueAddress,
              coverImage: null,
              registrationUrl: event.registrationUrl,
              branch: null,
              registrationState: event.registrationState
            }),
            body: event.body?.trim() || event.summary?.trim() || `${event.title}活动详情待补充。`,
            agenda: event.agenda.map((item) => ({ ...item }))
          };

          return [event.slug, detail] as const;
        })
      );

      return {
        summaries: sortEventSummaries(summaries),
        detailsBySlug
      };
    });
  }

  return eventFallbackPromise;
};

export const getImportedBranchFallback = async () => loadImportedBranches();

export const getImportedMemberSummariesFallback = async () => (await loadImportedMembers())?.summaries ?? null;

export const getImportedMemberDetailFallback = async (slug: string) => (await loadImportedMembers())?.detailsBySlug.get(slug) ?? null;

export const getImportedEventSummariesFallback = async () => (await loadImportedEvents())?.summaries ?? null;

export const getImportedEventDetailFallback = async (slug: string) => (await loadImportedEvents())?.detailsBySlug.get(slug) ?? null;

export const getImportedHomePayloadFallback = async (): Promise<PublicHomePayloadV2 | null> => {
  if (!homeFallbackPromise) {
    homeFallbackPromise = Promise.all([loadImportedBranches(), loadImportedEvents()]).then(([branches, events]) => {
      if (!branches?.length && !events?.summaries.length) {
        return null;
      }

      return {
        ...publicHomePayloadV2,
        featuredEvents: (events?.summaries ?? []).slice(0, 3),
        branchHighlights:
          branches?.slice(0, 3).map((branch) => ({
            slug: branch.slug,
            name: branch.name,
            cityName: branch.cityName,
            region: branch.region,
            summary: branch.summary,
            boardMemberCount: branch.boardMembers.length,
            coverImage: branch.coverImage
          })) ?? publicHomePayloadV2.branchHighlights
      };
    });
  }

  return homeFallbackPromise;
};
