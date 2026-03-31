#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from collections import Counter
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from zipfile import ZipFile
import xml.etree.ElementTree as ET

REPO_ROOT = Path(__file__).resolve().parents[1]
WORKBOOK_PATH = REPO_ROOT / "members.xlsx"
PUBLIC_OUTPUT_PATH = REPO_ROOT / "data" / "imports" / "tgo-members" / "members.json"
PRIVATE_OUTPUT_PATH = REPO_ROOT / "data" / "private-imports" / "tgo-members" / "members-private.json"
BRANCHES_PATH = REPO_ROOT / "data" / "imports" / "tgo-infoq" / "branches.json"

XML_NS = {
    "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "pr": "http://schemas.openxmlformats.org/package/2006/relationships"
}
DATE_COLUMNS = {"加入时间", "会籍时间", "新会员培训时间"}
PLACEHOLDER_VALUES = {
    "",
    "-",
    "--",
    "暂无",
    "暂无信息",
    "无",
    "无信息",
    "无信息0",
    "null",
    "none",
    "n/a",
    "na"
}
COMPANY_PLACEHOLDERS = PLACEHOLDER_VALUES | {"其他"}
TITLE_PLACEHOLDERS = PLACEHOLDER_VALUES | {"其他"}
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@dataclass(frozen=True)
class WorkbookSheetRef:
    name: str
    path: str


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def write_json(path: Path, payload: Any) -> None:
    ensure_dir(path.parent)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def normalize_text(value: Any) -> str:
    text = str(value or "").replace("\u3000", " ").replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def is_placeholder(value: str, extra: set[str] | None = None) -> bool:
    normalized = normalize_text(value).lower()
    if not normalized:
        return True

    allowed = PLACEHOLDER_VALUES if extra is None else PLACEHOLDER_VALUES | {item.lower() for item in extra}
    return normalized in allowed


def clean_value(value: str) -> str:
    text = normalize_text(value)
    return "" if is_placeholder(text) else text


def excel_serial_to_date(value: str) -> str:
    base = datetime(1899, 12, 30)
    date_value = base + timedelta(days=float(value))
    return date_value.strftime("%Y-%m-%d")


def column_index_from_ref(cell_ref: str) -> int:
    letters = "".join(character for character in cell_ref if character.isalpha())
    index = 0

    for character in letters:
        index = index * 26 + (ord(character.upper()) - 64)

    return index


def dedupe_headers(headers: list[str]) -> list[str]:
    counts: Counter[str] = Counter()
    result: list[str] = []

    for header in headers:
        base = normalize_text(header) or "column"
        counts[base] += 1
        result.append(base if counts[base] == 1 else f"{base}_{counts[base]}")

    return result


def load_sheet_ref(zip_file: ZipFile) -> WorkbookSheetRef:
    workbook_root = ET.fromstring(zip_file.read("xl/workbook.xml"))
    rels_root = ET.fromstring(zip_file.read("xl/_rels/workbook.xml.rels"))
    relationship_by_id = {
        relationship.attrib["Id"]: relationship.attrib["Target"]
        for relationship in rels_root.findall("pr:Relationship", XML_NS)
    }
    first_sheet = workbook_root.find("a:sheets/a:sheet", XML_NS)

    if first_sheet is None:
        raise RuntimeError("members.xlsx 中没有找到工作表。")

    relation_id = first_sheet.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
    if not relation_id or relation_id not in relationship_by_id:
        raise RuntimeError("members.xlsx 中的第一个工作表关系缺失。")

    return WorkbookSheetRef(name=first_sheet.attrib.get("name", "Sheet1"), path=f"xl/{relationship_by_id[relation_id]}")


def load_shared_strings(zip_file: ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in zip_file.namelist():
        return []

    shared_root = ET.fromstring(zip_file.read("xl/sharedStrings.xml"))
    return ["".join(node.text or "" for node in item.findall(".//a:t", XML_NS)) for item in shared_root.findall("a:si", XML_NS)]


def read_cell_value(cell: ET.Element, shared_strings: list[str]) -> str:
    cell_type = cell.attrib.get("t")

    if cell_type == "inlineStr":
        return "".join(node.text or "" for node in cell.findall(".//a:t", XML_NS))

    value_node = cell.find("a:v", XML_NS)
    if value_node is None:
        return ""

    raw_value = value_node.text or ""
    if cell_type == "s":
        return shared_strings[int(raw_value)]

    return raw_value


def parse_rows(workbook_path: Path) -> tuple[list[str], list[dict[str, str]], str]:
    with ZipFile(workbook_path) as zip_file:
        shared_strings = load_shared_strings(zip_file)
        sheet_ref = load_sheet_ref(zip_file)
        sheet_root = ET.fromstring(zip_file.read(sheet_ref.path))

        rows: list[list[str]] = []
        max_columns = 0
        for row in sheet_root.findall("a:sheetData/a:row", XML_NS):
            resolved: dict[int, str] = {}

            for cell in row.findall("a:c", XML_NS):
                cell_ref = cell.attrib.get("r", "")
                column_index = column_index_from_ref(cell_ref)
                if column_index <= 0:
                    continue
                resolved[column_index] = read_cell_value(cell, shared_strings)

            if not resolved:
                continue

            max_columns = max(max_columns, max(resolved))
            rows.append([resolved.get(index, "") for index in range(1, max_columns + 1)])

    if not rows:
        raise RuntimeError("members.xlsx 第一张工作表没有可读取的数据。")

    headers = dedupe_headers(rows[0])
    records: list[dict[str, str]] = []

    for raw_row in rows[1:]:
        padded = raw_row + [""] * (len(headers) - len(raw_row))
        row_record: dict[str, str] = {}

        for header, value in zip(headers, padded, strict=False):
            cleaned = normalize_text(value)
            base_header = header.split("_", 1)[0]
            if base_header in DATE_COLUMNS and cleaned:
                try:
                    cleaned = excel_serial_to_date(cleaned) if re.fullmatch(r"\d+(?:\.\d+)?", cleaned) else cleaned
                except Exception:
                    pass
            row_record[header] = cleaned

        records.append(row_record)

    return headers, records, sheet_ref.name


def load_branch_slug_map() -> dict[str, str]:
    if not BRANCHES_PATH.exists():
        return {}

    payload = json.loads(BRANCHES_PATH.read_text(encoding="utf-8"))
    branches = payload.get("branches", [])
    return {
        normalize_text(branch.get("cityName", "")): normalize_text(branch.get("slug", ""))
        for branch in branches
        if normalize_text(branch.get("cityName", "")) and normalize_text(branch.get("slug", ""))
    }


def build_slug(member_number: str, row_number: int) -> str:
    compact = re.sub(r"[^0-9A-Za-z]+", "", member_number)
    if compact:
        return f"member-{compact.lower()}"
    return f"member-row-{row_number}"


def build_bio(
    name: str,
    city_name: str,
    company: str,
    title: str,
    joined_at: str,
    membership_type: str,
    *,
    company_is_public: bool,
    title_is_public: bool
) -> str:
    fragments = []

    if city_name:
        fragments.append(f"参与 {city_name} 分会的长期交流")
    if company_is_public and title_is_public:
        fragments.append(f"现任 {company} {title}")
    elif company_is_public:
        fragments.append(f"来自 {company}")
    elif title_is_public:
        fragments.append(f"担任 {title}")
    if joined_at:
        fragments.append(f"于 {joined_at} 加入 TGO 鲲鹏会")
    if membership_type:
        fragments.append(f"当前公开会籍类型为 {membership_type}")

    if not fragments:
        return f"{name} 是 TGO 鲲鹏会公开成员。"

    return f"{name}，" + "，".join(fragments) + "。"


def normalize_public_member(row: dict[str, str], row_number: int, branch_slug_by_city: dict[str, str]) -> dict[str, Any] | None:
    name = clean_value(row.get("姓名", ""))
    if not name:
        return None

    city_name = clean_value(row.get("地区", ""))
    company = clean_value(row.get("公司", ""))
    company_is_public = not is_placeholder(company, COMPANY_PLACEHOLDERS)
    if is_placeholder(company, COMPANY_PLACEHOLDERS):
        company = "暂未公开"

    title = clean_value(row.get("职位", ""))
    title_is_public = not is_placeholder(title, TITLE_PLACEHOLDERS)
    if is_placeholder(title, TITLE_PLACEHOLDERS):
        title = "成员"

    joined_at = clean_value(row.get("加入时间", ""))
    membership_expires_at = clean_value(row.get("会籍时间", ""))
    membership_type = clean_value(row.get("会员类型", ""))
    member_number = clean_value(row.get("会员编号", "")) or str(row_number)
    email = clean_value(row.get("邮箱", ""))
    if email and not EMAIL_PATTERN.match(email):
        email = ""

    branch_slug = branch_slug_by_city.get(city_name, "") or None
    bio = build_bio(
        name,
        city_name,
        company,
        title,
        joined_at,
        membership_type,
        company_is_public=company_is_public,
        title_is_public=title_is_public
    )

    return {
        "sourceRow": row_number,
        "memberNumber": member_number,
        "slug": build_slug(member_number, row_number),
        "name": name,
        "cityName": city_name,
        "branchSlug": branch_slug,
        "company": company,
        "title": title,
        "membershipType": membership_type,
        "joinedAt": joined_at or None,
        "membershipExpiresAt": membership_expires_at or None,
        "email": email or None,
        "bio": bio
    }


def build_private_record(headers: list[str], row: dict[str, str], public_member: dict[str, Any]) -> dict[str, Any]:
    return {
        **public_member,
        "raw": {header: row.get(header, "") for header in headers}
    }


def create_outputs() -> None:
    if not WORKBOOK_PATH.exists():
        raise SystemExit(f"未找到成员工作簿：{WORKBOOK_PATH}")

    headers, rows, sheet_name = parse_rows(WORKBOOK_PATH)
    branch_slug_by_city = load_branch_slug_map()
    public_members: list[dict[str, Any]] = []
    private_members: list[dict[str, Any]] = []
    seen_slugs: set[str] = set()

    for index, row in enumerate(rows, start=2):
        public_member = normalize_public_member(row, index, branch_slug_by_city)
        if public_member is None:
            continue

        slug = public_member["slug"]
        if slug in seen_slugs:
            public_member["slug"] = f"{slug}-{index}"
        seen_slugs.add(public_member["slug"])

        public_members.append({
            key: value
            for key, value in public_member.items()
            if key != "email"
        })
        private_members.append(build_private_record(headers, row, public_member))

    city_counts = Counter(member["cityName"] or "未标注城市" for member in public_members)
    missing_branch_count = sum(1 for member in public_members if not member["branchSlug"])
    generated_at = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")

    write_json(
        PUBLIC_OUTPUT_PATH,
        {
            "generatedAt": generated_at,
            "source": str(WORKBOOK_PATH.relative_to(REPO_ROOT)),
            "sheetName": sheet_name,
            "count": len(public_members),
            "cityCounts": dict(sorted(city_counts.items(), key=lambda item: (-item[1], item[0]))),
            "missingBranchCount": missing_branch_count,
            "members": public_members
        }
    )
    write_json(
        PRIVATE_OUTPUT_PATH,
        {
            "generatedAt": generated_at,
            "source": str(WORKBOOK_PATH.relative_to(REPO_ROOT)),
            "sheetName": sheet_name,
            "count": len(private_members),
            "members": private_members
        }
    )

    print(
        f"[members] 已从 {WORKBOOK_PATH.name} 的“{sheet_name}”导出 {len(public_members)} 位成员；"
        f"公共种子写入 {PUBLIC_OUTPUT_PATH.relative_to(REPO_ROOT)}，完整私有导出写入 {PRIVATE_OUTPUT_PATH.relative_to(REPO_ROOT)}。"
    )


if __name__ == "__main__":
    create_outputs()
