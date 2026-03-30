#!/usr/bin/env python3
from __future__ import annotations

import concurrent.futures
import html
import json
import mimetypes
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

try:
    import requests
except ImportError as error:  # pragma: no cover - runtime guard
    raise SystemExit(
        "缺少 Python 依赖 requests，请先执行 `python3 -m pip install requests` 后再重试。"
    ) from error

requests.packages.urllib3.disable_warnings()  # type: ignore[attr-defined]

BASE_URL = "https://tgo.infoq.cn"
BROWSER_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
)
REQUEST_TIMEOUT = 60
DETAIL_CONCURRENCY = 8
DOWNLOAD_CONCURRENCY = 12

REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = REPO_ROOT / "data" / "imports" / "tgo-infoq"
SITE_PUBLIC_DIR = REPO_ROOT / "apps" / "site" / "public"
SITE_IMPORT_DIR = REPO_ROOT / "apps" / "site" / "public" / "imports" / "tgo-infoq"

POSITION_MAP = {
    1: "负责人",
    2: "学习产品负责人",
    3: "服务负责人",
    4: "会籍负责人",
    5: "小组负责人",
    6: "顾问",
    7: "外宣财务负责人"
}

JOB_TITLE_MAP = {
    1: "CTO",
    2: "CEO",
    3: "CIO",
    4: "联合创始人",
    5: "技术VP/副总裁",
    6: "总经理",
    7: "高级技术总监",
    8: "技术总监",
    9: "运维总监",
    10: "技术经理／主管",
    11: "首席架构师",
    12: "其他",
    13: "研发总监"
}

BRANCH_META: dict[int, dict[str, str]] = {
    1: {
        "slug": "beijing",
        "cityName": "北京",
        "region": "华北",
        "bannerUrl": "https://static001-test.geekbang.org/resource/image/8c/53/8c1b4ed3909428950538db36b7813153.png"
    },
    2: {
        "slug": "shanghai",
        "cityName": "上海",
        "region": "华东",
        "bannerUrl": "https://static001-test.geekbang.org/resource/image/30/48/3090ae16fb03460c271648f99efc2348.png"
    },
    3: {
        "slug": "hangzhou",
        "cityName": "杭州",
        "region": "华东",
        "bannerUrl": "https://static001-test.geekbang.org/resource/image/24/6d/243af9fa2663493da70d5b3de872156d.png"
    },
    4: {
        "slug": "guangzhou",
        "cityName": "广州",
        "region": "华南",
        "bannerUrl": "https://static001-test.geekbang.org/resource/image/e7/43/e7a9950851bba9c52e2f22e159a1ae43.png"
    },
    5: {
        "slug": "shenzhen",
        "cityName": "深圳",
        "region": "华南",
        "bannerUrl": "https://static001-test.geekbang.org/resource/image/c4/88/c48c7b19fc9e8fae43bf9aebb698cf88.png"
    },
    6: {
        "slug": "chengdu",
        "cityName": "成都",
        "region": "西南",
        "bannerUrl": "https://static001-test.geekbang.org/resource/image/51/30/51a695cfa2c359ff4d43237bdc04e730.png"
    },
    7: {
        "slug": "silicon-valley",
        "cityName": "硅谷",
        "region": "北美",
        "bannerUrl": "https://static001-test.geekbang.org/resource/image/8f/b6/8f429ab7f94a8316045bfeb0e18cb2b6.png"
    },
    8: {
        "slug": "nanjing",
        "cityName": "南京",
        "region": "华东",
        "bannerUrl": "https://static001-test.geekbang.org/resource/image/f1/15/f1893378cfdc9a0cb5775b4072255e15.png"
    },
    9: {
        "slug": "wuhan",
        "cityName": "武汉",
        "region": "华中",
        "bannerUrl": "https://static001-test.geekbang.org/resource/image/ef/2f/ef7cb4771c8a875d4d22d2fc19fa8e2f.png"
    },
    10: {
        "slug": "taipei",
        "cityName": "台北",
        "region": "中国台湾",
        "bannerUrl": "https://static001-test.geekbang.org/resource/image/15/f9/15dd37304fb0e4a3f4598e66323798f9.png"
    },
    11: {
        "slug": "xiamen",
        "cityName": "厦门",
        "region": "华南",
        "bannerUrl": "https://static001-test.geekbang.org/resource/image/b7/d2/b7696adf65163ece97de30b0e775c0d2.png"
    },
    12: {
        "slug": "suzhou",
        "cityName": "苏州",
        "region": "华东",
        "bannerUrl": "https://static001-test.geekbang.org/resource/image/e1/93/e1834c1e032a1cf20fcfcdd1aae33293.png"
    },
    13: {"slug": "hefei", "cityName": "合肥", "region": "华东", "bannerUrl": ""},
    14: {"slug": "tianjin", "cityName": "天津", "region": "华北", "bannerUrl": ""},
    16: {"slug": "fuzhou", "cityName": "福州", "region": "华南", "bannerUrl": ""},
    17: {"slug": "xian", "cityName": "西安", "region": "西北", "bannerUrl": ""},
    18: {"slug": "zhuhai", "cityName": "珠海", "region": "华南", "bannerUrl": ""},
    19: {"slug": "singapore", "cityName": "新加坡", "region": "东南亚", "bannerUrl": ""}
}

BRANCH_SLUG_BY_CITY_NAME = {
    meta["cityName"]: meta["slug"]
    for meta in BRANCH_META.values()
    if meta.get("cityName") and meta.get("slug")
}

CITY_ID_TO_NAME = {
    3631: "北京",
    3632: "天津",
    3633: "上海",
    168: "杭州",
    281: "广州",
    283: "深圳",
    373: "成都",
    3635: "硅谷",
    155: "南京",
    250: "武汉",
    486: "台北",
    196: "厦门",
    159: "苏州",
    179: "合肥",
    195: "福州",
    426: "西安",
    284: "珠海",
    2001: "新加坡"
}

SECTION_TITLE_BY_FIELD = {
    "events_profile_html": "活动简介",
    "events_procedure_html": "活动流程",
    "events_notice_html": "参会须知",
    "events_review_html": "活动回顾"
}

TAG_RE = re.compile(r"<[^>]+>")
LINE_BREAK_RE = re.compile(r"<\s*br\s*/?\s*>", re.IGNORECASE)
PARAGRAPH_END_RE = re.compile(r"</\s*(p|div|section|article|h[1-6])\s*>", re.IGNORECASE)
LIST_ITEM_OPEN_RE = re.compile(r"<\s*li[^>]*>", re.IGNORECASE)
LIST_ITEM_END_RE = re.compile(r"</\s*li\s*>", re.IGNORECASE)
IMG_SRC_RE = re.compile(r"<img[^>]+src=[\"']([^\"']+)[\"']", re.IGNORECASE)
AGENDA_LINE_RE = re.compile(r"^(?:[•●\-]\s*)?(\d{1,2}:\d{2}(?:\s*[—\-~～至]\s*\d{1,2}:\d{2})?)\s*(.+)$")


@dataclass(frozen=True)
class DownloadTask:
    source_url: str
    destination: Path


class TgoClient:
    def __init__(self) -> None:
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": BROWSER_UA})

    def _headers(self, referer_path: str | None = None) -> dict[str, str]:
        headers = {
            "Accept": "application/json, text/plain, */*",
            "X-Requested-With": "XMLHttpRequest"
        }
        if referer_path:
            headers["Referer"] = f"{BASE_URL}{referer_path}"
            headers["Origin"] = BASE_URL
        return headers

    def prime(self, path: str) -> None:
        response = self.session.get(f"{BASE_URL}{path}", timeout=REQUEST_TIMEOUT)
        response.raise_for_status()

    def get_json(self, path: str, *, params: dict[str, Any] | None = None, referer_path: str) -> Any:
        response = self.session.get(
            f"{BASE_URL}{path}",
            params=params,
            headers=self._headers(referer_path),
            timeout=REQUEST_TIMEOUT
        )
        response.raise_for_status()
        payload = response.json()
        if payload.get("code") != 0:
            raise RuntimeError(f"GET {path} 返回异常：{payload}")
        return payload["data"]

    def post_json(self, path: str, *, body: dict[str, Any], referer_path: str) -> Any:
        response = self.session.post(
            f"{BASE_URL}{path}",
            json=body,
            headers=self._headers(referer_path),
            timeout=REQUEST_TIMEOUT
        )
        response.raise_for_status()
        payload = response.json()
        if payload.get("code") != 0:
            raise RuntimeError(f"POST {path} 返回异常：{payload}")
        return payload["data"]

    def export_cookies(self) -> dict[str, str]:
        return self.session.cookies.get_dict()


def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def write_json(path: Path, payload: Any) -> None:
    ensure_dir(path.parent)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def strip_html_content(value: str | None) -> str:
    if not value:
        return ""
    text = LINE_BREAK_RE.sub("\n", value)
    text = PARAGRAPH_END_RE.sub("\n\n", text)
    text = LIST_ITEM_OPEN_RE.sub("- ", text)
    text = LIST_ITEM_END_RE.sub("\n", text)
    text = TAG_RE.sub("", text)
    text = html.unescape(text)
    text = text.replace("\r", "")
    lines = []
    for raw_line in text.split("\n"):
        compact = re.sub(r"\s+", " ", raw_line).strip()
        if compact:
            lines.append(compact)
        elif lines and lines[-1] != "":
            lines.append("")
    while lines and lines[-1] == "":
        lines.pop()
    return "\n".join(lines)


def summarize_text(value: str, limit: int = 110) -> str:
    normalized = re.sub(r"\s+", " ", value).strip()
    if len(normalized) <= limit:
        return normalized
    return normalized[: limit - 1].rstrip() + "…"


def first_non_empty(*values: Any) -> str | None:
    for value in values:
        if isinstance(value, str):
            stripped = value.strip()
            if stripped:
                return stripped
    return None


def seconds_to_iso(value: Any) -> str | None:
    if value in (None, ""):
        return None
    try:
        return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(int(value)))
    except Exception:
        return None


def guess_extension(url: str, content_type: str | None = None) -> str:
    parsed = urlparse(url)
    suffix = Path(parsed.path).suffix.lower()
    if suffix:
        return suffix
    if content_type:
        guessed = mimetypes.guess_extension(content_type.split(";")[0].strip())
        if guessed:
            return guessed
    return ".bin"


def normalize_sponsor_ids(value: Any) -> list[int]:
    if isinstance(value, list):
        items = value
    elif isinstance(value, str):
        items = [part.strip() for part in value.split(",") if part.strip()]
    elif value is None:
        items = []
    else:
        items = [value]

    result: list[int] = []
    for item in items:
        try:
            sponsor_id = int(item)
        except Exception:
            continue
        if sponsor_id > 0:
            result.append(sponsor_id)
    return result


def extract_inline_image_urls(*html_blocks: str | None) -> list[str]:
    urls: list[str] = []
    for block in html_blocks:
        if not block:
            continue
        for match in IMG_SRC_RE.findall(block):
            source_url = match.strip()
            if source_url and source_url not in urls:
                urls.append(source_url)
    return urls


def parse_agenda(detail: dict[str, Any]) -> list[dict[str, str]]:
    procedure_text = strip_html_content(first_non_empty(detail.get("events_procedure_html"), detail.get("events_procedure")))
    agenda: list[dict[str, str]] = []
    for line in procedure_text.splitlines():
        cleaned = line.strip()
        if not cleaned:
            continue
        match = AGENDA_LINE_RE.match(cleaned)
        if match:
            agenda.append(
                {
                    "time": match.group(1).replace("—", "-").replace("～", "-").replace("至", "-"),
                    "title": match.group(2).strip(),
                    "speaker": "",
                    "summary": ""
                }
            )
    if agenda:
        return agenda

    guests = detail.get("guests") or detail.get("share_guests") or []
    for guest in guests:
        name = first_non_empty(guest.get("name"))
        if not name:
            continue
        agenda.append(
            {
                "time": "",
                "title": guest.get("theme", "嘉宾分享") or "嘉宾分享",
                "speaker": name,
                "summary": first_non_empty(guest.get("content_profile"), guest.get("position"), guest.get("company")) or ""
            }
        )
    return agenda


def build_event_body(detail: dict[str, Any]) -> str:
    sections: list[str] = []
    for field_name, title in SECTION_TITLE_BY_FIELD.items():
        content = strip_html_content(detail.get(field_name) or detail.get(field_name.replace("_html", "")))
        if content:
            sections.append(f"{title}\n{content}")
    return "\n\n".join(sections).strip()


def branch_name_from_meta(branch_id: int) -> str:
    meta = BRANCH_META.get(branch_id)
    if not meta:
        return f"分会 {branch_id}"
    return f"{meta['cityName']}分会"


def city_name_from_event(detail: dict[str, Any], sponsor_ids: list[int]) -> str:
    for sponsor_id in sponsor_ids:
        meta = BRANCH_META.get(sponsor_id)
        if meta:
            return meta["cityName"]
    city_name = CITY_ID_TO_NAME.get(int(detail.get("city") or 0))
    if city_name:
        return city_name
    address = first_non_empty(detail.get("address"))
    return address.split("(")[0].strip() if address else "待定"


def build_branch_summary(city_name: str, member_count: int, roles: list[str]) -> tuple[str, str]:
    role_text = "、".join(roles[:3]) if roles else "董事会协作"
    summary = f"{city_name}分会当前公开展示 {member_count} 位董事会成员，覆盖 {role_text} 等组织分工。"
    body = (
        f"本页数据来源于 TGO 鲲鹏会官网董事会成员页，当前整理了 {city_name}分会公开展示的 "
        f"{member_count} 位董事会成员信息，保留头像、姓名、公司与组织身份等后续部署所需字段。"
    )
    return summary, body


def to_local_public_path(destination: Path) -> str:
    return "/" + destination.relative_to(SITE_PUBLIC_DIR).as_posix()


def download_binary(task: DownloadTask) -> tuple[str, str, int]:
    task.destination.parent.mkdir(parents=True, exist_ok=True)
    if task.destination.exists():
        return (task.source_url, task.destination.as_posix(), 0)
    try:
        response = requests.get(task.source_url, headers={"User-Agent": BROWSER_UA}, timeout=REQUEST_TIMEOUT)
    except requests.exceptions.SSLError:
        response = requests.get(
            task.source_url,
            headers={"User-Agent": BROWSER_UA},
            timeout=REQUEST_TIMEOUT,
            verify=False
        )
    response.raise_for_status()
    task.destination.write_bytes(response.content)
    return (task.source_url, task.destination.as_posix(), len(response.content))


def collect_downloads(
    branches_payload: list[dict[str, Any]],
    events_payload: list[dict[str, Any]]
) -> tuple[list[DownloadTask], dict[str, str]]:
    tasks: list[DownloadTask] = []
    url_to_local_path: dict[str, str] = {}

    def register(url: str | None, relative_path: str | None) -> None:
        if not url or not relative_path:
            return
        normalized_url = url.strip()
        if not normalized_url or normalized_url in url_to_local_path:
            return
        destination = SITE_IMPORT_DIR / relative_path
        url_to_local_path[normalized_url] = to_local_public_path(destination)
        tasks.append(DownloadTask(source_url=normalized_url, destination=destination))

    for branch in branches_payload:
        branch_id = int(branch["branch_id"])
        meta = BRANCH_META.get(branch_id, {})
        banner_url = meta.get("bannerUrl", "").strip()
        if banner_url:
            extension = guess_extension(banner_url)
            register(banner_url, f"branches/banners/{meta['slug']}{extension}")
        for member in branch.get("content", []):
            avatar_url = first_non_empty(member.get("half_length_portrait"))
            if not avatar_url:
                continue
            extension = guess_extension(avatar_url)
            register(
                avatar_url,
                f"branches/members/{meta.get('slug', branch_id)}/{int(member.get('user_id') or 0)}{extension}"
            )

    for event in events_payload:
        event_id = int(event["id"])
        cover_url = first_non_empty(event.get("notice_image"))
        if cover_url:
            register(cover_url, f"events/covers/{event_id}{guess_extension(cover_url)}")
        for guest in event.get("guests") or []:
            guest_image = first_non_empty(guest.get("image"))
            if guest_image:
                guest_id = int(guest.get("id") or 0)
                register(guest_image, f"events/guests/{event_id}-{guest_id}{guess_extension(guest_image)}")
        for inline_url in extract_inline_image_urls(
            event.get("events_profile_html"),
            event.get("events_procedure_html"),
            event.get("events_notice_html"),
            event.get("events_review_html")
        ):
            suffix = guess_extension(inline_url)
            safe_name = re.sub(r"[^a-zA-Z0-9_-]+", "-", Path(urlparse(inline_url).path).stem).strip("-") or "inline"
            register(inline_url, f"events/inline/{event_id}/{safe_name}{suffix}")

    return tasks, url_to_local_path


def run_downloads(tasks: list[DownloadTask]) -> dict[str, Any]:
    if not tasks:
        return {"downloaded": 0, "skipped": 0, "bytes": 0, "errors": []}

    downloaded = 0
    skipped = 0
    total_bytes = 0
    errors: list[dict[str, str]] = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=DOWNLOAD_CONCURRENCY) as executor:
        future_map = {executor.submit(download_binary, task): task for task in tasks}
        for future in concurrent.futures.as_completed(future_map):
            task = future_map[future]
            try:
                _, _, byte_count = future.result()
                if byte_count == 0:
                    skipped += 1
                else:
                    downloaded += 1
                    total_bytes += byte_count
            except Exception as error:  # pragma: no cover - network variability
                errors.append({"url": task.source_url, "error": str(error)})

    return {
        "downloaded": downloaded,
        "skipped": skipped,
        "bytes": total_bytes,
        "errors": errors
    }


def fetch_event_details(client: TgoClient, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    cookies = client.export_cookies()

    def fetch_one(item: dict[str, Any]) -> dict[str, Any]:
        event_id = int(item["id"])
        response = requests.post(
            f"{BASE_URL}/serv/tgo/events/detail",
            json={"event_id": event_id},
            cookies=cookies,
            headers={
                "User-Agent": BROWSER_UA,
                "Accept": "application/json, text/plain, */*",
                "X-Requested-With": "XMLHttpRequest",
                "Referer": f"{BASE_URL}/event/{event_id}",
                "Origin": BASE_URL
            },
            timeout=REQUEST_TIMEOUT
        )
        response.raise_for_status()
        payload = response.json()
        if payload.get("code") != 0:
            raise RuntimeError(f"活动 {event_id} 详情抓取失败：{payload}")
        detail = payload["data"]
        if not isinstance(detail, dict):
            raise RuntimeError(f"活动 {event_id} 详情结构异常：{detail!r}")
        merged = dict(item)
        merged.update(detail)
        return merged

    details_by_id: dict[int, dict[str, Any]] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=DETAIL_CONCURRENCY) as executor:
        future_map = {executor.submit(fetch_one, item): int(item["id"]) for item in items}
        for future in concurrent.futures.as_completed(future_map):
            event_id = future_map[future]
            details_by_id[event_id] = future.result()

    return [details_by_id[int(item["id"])] for item in items]


def normalize_branches(branch_rows: list[dict[str, Any]], url_to_local_path: dict[str, str]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for branch in branch_rows:
        branch_id = int(branch["branch_id"])
        meta = BRANCH_META.get(branch_id, {"slug": f"branch-{branch_id}", "cityName": CITY_ID_TO_NAME.get(int(branch.get("city") or 0), f"分会{branch_id}"), "region": "", "bannerUrl": ""})
        members: list[dict[str, Any]] = []
        roles: list[str] = []
        for index, member in enumerate(branch.get("content") or []):
            organization_role = POSITION_MAP.get(int(member.get("position_type") or 0), "董事会成员")
            if organization_role not in roles:
                roles.append(organization_role)
            job_title = first_non_empty(member.get("job_title_content"))
            if not job_title:
                job_title = JOB_TITLE_MAP.get(int(member.get("job_title") or 0), "")
                if job_title == "其他":
                    job_title = ""
            avatar_source = first_non_empty(member.get("half_length_portrait"))
            avatar_local = url_to_local_path.get(avatar_source or "") if avatar_source else None
            members.append(
                {
                    "sourceUserId": int(member.get("user_id") or 0),
                    "displayName": first_non_empty(member.get("name")) or "未命名成员",
                    "company": first_non_empty(member.get("company_name")) or "待补充",
                    "organizationRole": organization_role,
                    "jobTitle": job_title or "",
                    "bio": f"现任职务：{job_title}" if job_title else "",
                    "avatar": {
                        "sourceUrl": avatar_source,
                        "localPath": avatar_local
                    } if avatar_source else None,
                    "sortOrder": index
                }
            )
        summary, body = build_branch_summary(meta["cityName"], len(members), roles)
        banner_source = meta.get("bannerUrl", "").strip() or None
        normalized.append(
            {
                "sourceBranchId": branch_id,
                "slug": meta["slug"],
                "name": f"{meta['cityName']}分会",
                "cityName": meta["cityName"],
                "region": meta.get("region", ""),
                "summary": summary,
                "body": body,
                "coverImage": {
                    "sourceUrl": banner_source,
                    "localPath": url_to_local_path.get(banner_source or "")
                } if banner_source else None,
                "boardMemberCount": len(members),
                "boardMembers": members
            }
        )
    normalized.sort(key=lambda item: item["sourceBranchId"])
    return normalized


def normalize_events(
    detail_rows: list[dict[str, Any]],
    event_type_rows: list[dict[str, Any]],
    url_to_local_path: dict[str, str]
) -> list[dict[str, Any]]:
    event_type_map: dict[int, dict[str, Any]] = {}
    event_type_parent: dict[int, dict[str, Any]] = {}
    for group in event_type_rows:
        event_type_parent[int(group["id"])] = group
        children = group.get("children") or []
        if children:
            for child in children:
                event_type_map[int(child["id"])] = {
                    "id": int(child["id"]),
                    "title": child["title"],
                    "parentId": int(group["id"]),
                    "parentTitle": group["title"]
                }
        else:
            event_type_map[int(group["id"])] = {
                "id": int(group["id"]),
                "title": group["title"],
                "parentId": None,
                "parentTitle": None
            }

    normalized: list[dict[str, Any]] = []
    for event in sorted(detail_rows, key=lambda item: int(item["id"])):
        sponsor_ids = normalize_sponsor_ids(event.get("sponsor"))
        city_name = city_name_from_event(event, sponsor_ids)
        branch_slugs = list(
            dict.fromkeys(
                [BRANCH_META[sponsor_id]["slug"] for sponsor_id in sponsor_ids if sponsor_id in BRANCH_META]
            )
        )
        if not branch_slugs and city_name in BRANCH_SLUG_BY_CITY_NAME:
            branch_slugs = [BRANCH_SLUG_BY_CITY_NAME[city_name]]
        profile_text = strip_html_content(first_non_empty(event.get("events_profile_html"), event.get("events_profile")))
        body = build_event_body(event)
        cover_source = first_non_empty(event.get("notice_image"))
        registration_url = first_non_empty(
            event.get("third_party_link"),
            event.get("apply_link"),
            event.get("link")
        )
        event_status = int(event.get("events_status") or 0)
        registration_state = "open" if event_status == 1 else "closed"
        event_type = event_type_map.get(int(event.get("event_type") or 0))
        guests = event.get("guests") or []
        normalized.append(
            {
                "sourceEventId": int(event["id"]),
                "slug": f"event-{int(event['id'])}",
                "title": first_non_empty(event.get("title")) or f"活动 {event['id']}",
                "summary": summarize_text(profile_text or body or first_non_empty(event.get("theme")) or ""),
                "body": body or profile_text,
                "startsAt": seconds_to_iso(event.get("begin_time")),
                "endsAt": seconds_to_iso(event.get("end_time")),
                "cityName": city_name,
                "venueName": city_name,
                "venueAddress": first_non_empty(event.get("address")) or city_name,
                "branchSlugs": branch_slugs,
                "primaryBranchSlug": branch_slugs[0] if branch_slugs else None,
                "registrationState": registration_state,
                "registrationUrl": registration_url,
                "coverImage": {
                    "sourceUrl": cover_source,
                    "localPath": url_to_local_path.get(cover_source or "")
                } if cover_source else None,
                "agenda": parse_agenda(event),
                "guestNames": [guest.get("name", "").strip() for guest in guests if first_non_empty(guest.get("name"))],
                "eventType": event_type,
                "raw": {
                    "status": int(event.get("status") or 0),
                    "eventsStatus": event_status,
                    "formId": int(event.get("form_id") or 0),
                    "feedbackFormId": int(event.get("feedback_form_id") or 0),
                    "ticketAmount": int(event.get("ticket_amount") or 0),
                    "marginAmount": int(event.get("margin_amount") or 0),
                    "sponsorIds": sponsor_ids,
                    "country": int(event.get("country") or 0),
                    "province": int(event.get("province") or 0),
                    "city": int(event.get("city") or 0),
                    "currTime": seconds_to_iso(event.get("curr_time"))
                }
            }
        )
    return normalized


def main() -> int:
    started_at = time.time()
    ensure_dir(DATA_DIR)
    ensure_dir(SITE_IMPORT_DIR)

    client = TgoClient()

    print("[tgo-infoq] 预热分会与活动页面 cookie...")
    client.prime("/we/branches")
    client.prime("/event")

    print("[tgo-infoq] 抓取分会董事会数据...")
    branch_payload = client.get_json("/serv/tgo/branch/list", referer_path="/we/branches")["list"]

    print("[tgo-infoq] 抓取活动类型与分页列表...")
    event_types = client.get_json("/serv/tgo/events/types", referer_path="/event")
    first_event_page = client.post_json("/serv/tgo/events/get-list", body={"page": 1}, referer_path="/event")
    event_page_count = int(first_event_page["page"]["pages"])
    event_rows = list(first_event_page["list"])
    for page_number in range(2, event_page_count + 1):
        page_data = client.post_json("/serv/tgo/events/get-list", body={"page": page_number}, referer_path="/event")
        event_rows.extend(page_data["list"])
        print(f"[tgo-infoq] 已抓取活动列表分页 {page_number}/{event_page_count}，累计 {len(event_rows)} 条")

    deduped_event_rows: list[dict[str, Any]] = []
    seen_event_ids: set[int] = set()
    for event in event_rows:
        event_id = int(event["id"])
        if event_id in seen_event_ids:
            continue
        seen_event_ids.add(event_id)
        deduped_event_rows.append(event)
    event_rows = deduped_event_rows

    print(f"[tgo-infoq] 抓取 {len(event_rows)} 条活动详情...")
    event_details = fetch_event_details(client, event_rows)

    print("[tgo-infoq] 规划并下载本地图片资源...")
    download_tasks, url_to_local_path = collect_downloads(branch_payload, event_details)
    download_report = run_downloads(download_tasks)
    if download_report["errors"]:
        print(f"[tgo-infoq] 图片下载出现 {len(download_report['errors'])} 条错误，已记录到 summary.json。")

    print("[tgo-infoq] 生成规范化 JSON...")
    normalized_branches = normalize_branches(branch_payload, url_to_local_path)
    normalized_events = normalize_events(event_details, event_types, url_to_local_path)

    summary = {
        "generatedAt": now_iso(),
        "source": {
            "branches": f"{BASE_URL}/we/branches",
            "events": f"{BASE_URL}/event"
        },
        "counts": {
            "branches": len(normalized_branches),
            "boardMembers": sum(len(branch["boardMembers"]) for branch in normalized_branches),
            "events": len(normalized_events),
            "downloadTasks": len(download_tasks)
        },
        "downloads": download_report,
        "durationSeconds": round(time.time() - started_at, 2)
    }

    write_json(
        DATA_DIR / "branches.json",
        {
            "generatedAt": summary["generatedAt"],
            "source": summary["source"]["branches"],
            "count": len(normalized_branches),
            "branches": normalized_branches
        }
    )
    write_json(
        DATA_DIR / "events.json",
        {
            "generatedAt": summary["generatedAt"],
            "source": summary["source"]["events"],
            "count": len(normalized_events),
            "eventTypes": event_types,
            "events": normalized_events
        }
    )
    write_json(DATA_DIR / "summary.json", summary)

    print(
        "[tgo-infoq] 完成："
        f"{summary['counts']['branches']} 个分会、"
        f"{summary['counts']['boardMembers']} 位董事会成员、"
        f"{summary['counts']['events']} 条活动。"
    )
    print(f"[tgo-infoq] JSON 输出目录：{DATA_DIR}")
    print(f"[tgo-infoq] 本地图片目录：{SITE_IMPORT_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
