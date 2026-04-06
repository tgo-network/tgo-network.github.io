import assert from "node:assert/strict";
import test from "node:test";

import type { MemberSummary } from "@tgo/shared";

import { createMemberSearchIndex, filterMemberSearchIndex, sortMemberSummaries } from "../src/lib/member-search.js";

const members: MemberSummary[] = [
  {
    slug: "alice",
    name: "Alice Chen",
    company: "Signal Labs",
    title: "CTO",
    avatar: null,
    branch: {
      slug: "shanghai",
      name: "上海分会",
      cityName: "上海"
    },
    joinedAt: "2024-01-10"
  },
  {
    slug: "bob",
    name: "Bob Wu",
    company: "Northern Systems",
    title: "Founder",
    avatar: null,
    branch: {
      slug: "beijing",
      name: "北京分会",
      cityName: "北京"
    },
    joinedAt: "2023-05-01"
  },
  {
    slug: "carol",
    name: "Carol Lin",
    company: "Signal Labs",
    title: "VP Product",
    avatar: null,
    branch: null,
    joinedAt: "invalid-date"
  }
];

test("sorts member summaries by join date descending and then by name", () => {
  const sorted = sortMemberSummaries([
    members[1],
    members[2],
    members[0]
  ]);

  assert.deepEqual(
    sorted.map((member) => member.slug),
    ["alice", "bob", "carol"]
  );
});

test("filters the search index by keyword, city, and branch slug", () => {
  const index = createMemberSearchIndex(members);

  assert.deepEqual(
    filterMemberSearchIndex(index, {
      q: "signal"
    }).map((member) => member.slug),
    ["alice", "carol"]
  );

  assert.deepEqual(
    filterMemberSearchIndex(index, {
      q: "北京",
      city: "北京"
    }).map((member) => member.slug),
    ["bob"]
  );

  assert.deepEqual(
    filterMemberSearchIndex(index, {
      q: "cto",
      branchSlug: "shanghai"
    }).map((member) => member.slug),
    ["alice"]
  );
});
