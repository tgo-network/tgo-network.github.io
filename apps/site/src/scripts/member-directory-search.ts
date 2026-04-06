import type { MemberSummary } from "@tgo/shared";

import { filterMemberSearchIndex, type MemberSearchIndexItem } from "../lib/member-search.js";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const buildMemberCardMarkup = (member: MemberSummary) => {
  const avatarMarkup = member.avatar
    ? `<img class="member-directory-avatar" src="${escapeHtml(member.avatar.url)}" alt="${escapeHtml(member.avatar.alt)}" loading="lazy" />`
    : `<div class="member-directory-avatar member-directory-avatar-fallback" aria-hidden="true">${escapeHtml(member.name.slice(0, 1))}</div>`;

  return `<a class="panel member-directory-card" href="/members/${encodeURIComponent(member.slug)}">
    <div class="member-directory-head">
      ${avatarMarkup}
      <div class="member-directory-copy">
        <p class="member-directory-branch">${escapeHtml(member.branch?.name ?? "未标注分会")}</p>
        <h2>${escapeHtml(member.name)}</h2>
        <p class="member-directory-company">${escapeHtml(member.company)}</p>
        <p class="member-directory-title">${escapeHtml(member.title)}</p>
      </div>
    </div>
  </a>`;
};

const buildMemberSearchUrl = (query: string, branchSlug: string, city: string, apiBase: string) => {
  const search = new URLSearchParams({
    q: query
  });

  if (branchSlug) {
    search.set("branchSlug", branchSlug);
  }

  if (city) {
    search.set("city", city);
  }

  const path = `/api/public/v1/members?${search.toString()}`;
  return apiBase ? new URL(path, apiBase).toString() : path;
};

const readMemberSearchPayload = async (query: string, branchSlug: string, city: string, apiBase: string) => {
  const response = await fetch(buildMemberSearchUrl(query, branchSlug, city, apiBase), {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`member search api unavailable: ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: MemberSummary[];
  };

  if (!Array.isArray(payload.data)) {
    throw new Error("member search api payload invalid");
  }

  return payload.data;
};

const readStaticSearchIndex = async (searchIndexPath: string) => {
  const response = await fetch(searchIndexPath, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`member search index unavailable: ${response.status}`);
  }

  const payload = (await response.json()) as MemberSearchIndexItem[];

  if (!Array.isArray(payload)) {
    throw new Error("member search index payload invalid");
  }

  return payload;
};

export const setupMemberDirectorySearch = () => {
  const form = document.querySelector("[data-member-search-form]");
  const input = document.querySelector("[data-member-search-input]");
  const status = document.querySelector("[data-member-search-status]");
  const summary = document.querySelector("[data-member-directory-summary]");
  const grid = document.querySelector("[data-member-directory-grid]");
  const pagination = document.querySelector("[data-member-directory-pagination]");
  const emptyState = document.querySelector("[data-member-directory-empty-state]");
  const emptyTitle = document.querySelector("[data-member-directory-empty-title]");
  const emptyCopy = document.querySelector("[data-member-directory-empty-copy]");
  const resetButton = document.querySelector("[data-member-search-reset]");

  if (
    !(form instanceof HTMLFormElement) ||
    !(input instanceof HTMLInputElement) ||
    !(status instanceof HTMLElement) ||
    !(summary instanceof HTMLElement) ||
    !(grid instanceof HTMLElement) ||
    !(pagination instanceof HTMLElement) ||
    !(emptyState instanceof HTMLElement) ||
    !(emptyTitle instanceof HTMLElement) ||
    !(emptyCopy instanceof HTMLElement) ||
    !(resetButton instanceof HTMLButtonElement)
  ) {
    return;
  }

  const defaultGridMarkup = grid.innerHTML;
  const defaultSummary = summary.textContent ?? "";
  const defaultEmptyTitle = emptyTitle.textContent ?? "暂无成员";
  const defaultEmptyCopy = emptyCopy.textContent ?? "当前筛选下暂无可展示的成员。";
  const currentUrl = new URL(window.location.href);
  const apiBase = form.dataset.apiBase ?? "";
  const currentCity = form.dataset.currentCity ?? "";
  const currentBranchSlug = form.dataset.currentBranchSlug ?? "";
  const searchIndexPath = form.dataset.searchIndexPath ?? "/members/search-index.json";
  let requestToken = 0;

  const restoreDefaultState = () => {
    grid.innerHTML = defaultGridMarkup;
    summary.textContent = defaultSummary;
    emptyTitle.textContent = defaultEmptyTitle;
    emptyCopy.textContent = defaultEmptyCopy;
    emptyState.hidden = grid.children.length > 0;
    pagination.hidden = false;
    status.textContent = "";
    input.value = "";
    resetButton.hidden = true;
    currentUrl.searchParams.delete("q");
    window.history.replaceState({}, "", currentUrl);
  };

  const renderSearchResults = (query: string, results: MemberSummary[]) => {
    grid.innerHTML = results.map((member) => buildMemberCardMarkup(member)).join("");
    emptyTitle.textContent = "未找到匹配成员";
    emptyCopy.textContent = `当前关键词“${query}”下暂无匹配结果，请尝试名字、公司或头衔。`;
    emptyState.hidden = results.length > 0;
    pagination.hidden = true;
    summary.textContent = `关键词“${query}”匹配到 ${results.length} 位成员。`;
    status.textContent = results.length > 0 ? "已显示搜索结果。" : "没有找到符合条件的成员。";
    resetButton.hidden = false;
    currentUrl.searchParams.set("q", query);
    window.history.replaceState({}, "", currentUrl);
  };

  const runSearch = async (rawQuery: string) => {
    const query = rawQuery.trim();

    if (!query) {
      restoreDefaultState();
      return;
    }

    requestToken += 1;
    const currentToken = requestToken;
    status.textContent = "正在搜索成员...";
    summary.textContent = `正在搜索“${query}”...`;
    resetButton.hidden = false;

    try {
      let results: MemberSummary[];

      try {
        results = await readMemberSearchPayload(query, currentBranchSlug, currentCity, apiBase);
      } catch {
        const index = await readStaticSearchIndex(searchIndexPath);
        results = filterMemberSearchIndex(index, {
          q: query,
          city: currentCity,
          branchSlug: currentBranchSlug
        });
      }

      if (currentToken !== requestToken) {
        return;
      }

      renderSearchResults(query, results);
    } catch {
      if (currentToken !== requestToken) {
        return;
      }

      summary.textContent = defaultSummary;
      status.textContent = "搜索暂时不可用，请稍后重试。";
    }
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await runSearch(input.value);
  });

  resetButton.addEventListener("click", () => {
    restoreDefaultState();
    input.focus();
  });

  const initialQuery = currentUrl.searchParams.get("q");

  if (initialQuery) {
    input.value = initialQuery;
    void runSearch(initialQuery);
  }
};
