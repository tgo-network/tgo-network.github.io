import { createMemberSearchIndex, sortMemberSummaries } from "../../lib/member-search.js";
import { listMembers } from "../../lib/public-api.js";

export const prerender = true;

export const GET = async () => {
  const members = sortMemberSummaries(await listMembers());
  const body = JSON.stringify(createMemberSearchIndex(members));

  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
};
