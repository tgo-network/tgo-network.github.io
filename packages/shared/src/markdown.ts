/// <reference path="./markdown-it.d.ts" />

import MarkdownIt from "markdown-it";

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false
});

const eventLegacyHeadingPatterns = [
  /^活动简介$/,
  /^活动流程$/,
  /^参会须知$/,
  /^谁该来.*参与.*$/,
  /^活动亮点$/,
  /^适合谁(?:参加)?$/,
  /^适合人群$/,
  /^报名方式$/,
  /^报名链接$/,
  /^温馨提示$/,
  /^参会标准$/,
  /^非会员申请标准$/
];

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

const getLastContentLine = (lines: string[]) => {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index] && lines[index] !== "") {
      return lines[index];
    }
  }

  return "";
};

const pushBlankLine = (lines: string[]) => {
  if (lines.length > 0 && lines[lines.length - 1] !== "") {
    lines.push("");
  }
};

export const normalizeLegacyEventMarkdown = (source: string) => {
  if (source.trim().length === 0) {
    return "";
  }

  const normalizedLines: string[] = [];

  for (const rawLine of source.replace(/\r/g, "").split("\n")) {
    const line = rawLine.replace(/\u00a0/g, " ").trim();

    if (line.length === 0) {
      pushBlankLine(normalizedLines);
      continue;
    }

    if (/^#{1,6}\s/.test(line) || /^>\s?/.test(line) || /^```/.test(line)) {
      normalizedLines.push(line);
      continue;
    }

    const headingText = line.replace(/[：:]$/, "");

    if (eventLegacyHeadingPatterns.some((pattern) => pattern.test(headingText))) {
      if (getLastContentLine(normalizedLines) !== `## ${headingText}`) {
        pushBlankLine(normalizedLines);
        normalizedLines.push(`## ${headingText}`);
        pushBlankLine(normalizedLines);
      }
      continue;
    }

    if (/^🦞\s*/.test(line)) {
      const subheading = line.replace(/^🦞\s*/, "").trim();

      if (subheading.length > 0 && getLastContentLine(normalizedLines) !== `### ${subheading}`) {
        pushBlankLine(normalizedLines);
        normalizedLines.push(`### ${subheading}`);
        pushBlankLine(normalizedLines);
      }
      continue;
    }

    if (/^[•●▪■◆★⭐]\s*/.test(line)) {
      normalizedLines.push(`- ${line.replace(/^[•●▪■◆★⭐]\s*/, "").trim()}`);
      continue;
    }

    const orderedListMatch = line.match(/^(\d+)[、.．)]\s*(.+)$/);

    if (orderedListMatch) {
      normalizedLines.push(`${orderedListMatch[1]}. ${orderedListMatch[2].trim()}`);
      continue;
    }

    normalizedLines.push(line);
  }

  return normalizedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
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
