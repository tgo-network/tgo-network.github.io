import assert from "node:assert/strict";
import test from "node:test";

import { clampPageNumber, getCitySegment, getPageCount, slicePageItems } from "../src/lib/directory-pagination.js";

test("calculates page counts and clamps invalid page numbers", () => {
  assert.equal(getPageCount(0, 12), 1);
  assert.equal(getPageCount(25, 12), 3);
  assert.equal(clampPageNumber(0, 3), 1);
  assert.equal(clampPageNumber(9, 3), 3);
  assert.equal(clampPageNumber(Number.NaN, 3), 1);
});

test("returns a stable slice for the requested page", () => {
  const items = [1, 2, 3, 4, 5, 6, 7];
  const paged = slicePageItems(items, 2, 3);

  assert.deepEqual(paged.items, [4, 5, 6]);
  assert.equal(paged.page, 2);
  assert.equal(paged.pageCount, 3);
  assert.equal(paged.total, 7);
});

test("maps known city labels to stable route segments", () => {
  assert.equal(getCitySegment("北京"), "beijing");
  assert.equal(getCitySegment("台北"), "taipei");
  assert.equal(getCitySegment("未标注城市"), "unassigned");
});
