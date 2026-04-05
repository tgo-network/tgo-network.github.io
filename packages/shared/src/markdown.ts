/// <reference path="./markdown-it.d.ts" />

import MarkdownIt from "markdown-it";

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false
});

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");

export const renderMarkdownToHtml = (source: string) => {
  if (source.trim().length === 0) {
    return "";
  }

  return markdown.render(source);
};

export const markdownToPlainText = (source: string) => {
  if (source.trim().length === 0) {
    return "";
  }

  return decodeHtmlEntities(renderMarkdownToHtml(source))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};
