#!/usr/bin/env python3
from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
IMPORT_ROOT = REPO_ROOT / "apps/site/public/imports/tgo-infoq"
MIRROR_ROOT = REPO_ROOT / "apps/site/public/mirrors/tgo-infoq"

QUALITY = "82"
EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
WIDTH_RULES = {
    "events/covers": 1200,
    "branches/banners": 1600,
    "branches/members": 320,
}


def iter_sources():
    for source in IMPORT_ROOT.rglob("*"):
        if not source.is_file() or source.suffix.lower() not in EXTENSIONS:
            continue

        relative = source.relative_to(IMPORT_ROOT).as_posix()
        width = next((value for prefix, value in WIDTH_RULES.items() if relative.startswith(prefix)), None)

        if width is None:
            continue

        target = (MIRROR_ROOT / source.relative_to(IMPORT_ROOT)).with_suffix(".webp")
        yield source, target, width


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def convert_directly(source: Path, target: Path, width: int) -> None:
    run(
        [
            "cwebp",
            "-quiet",
            "-q",
            QUALITY,
            "-resize",
            str(width),
            "0",
            str(source),
            "-o",
            str(target),
        ]
    )


def convert_via_png(source: Path, target: Path, width: int) -> None:
    with tempfile.TemporaryDirectory(prefix="tgo-mirror-") as temp_dir:
        normalized = Path(temp_dir) / f"{source.stem}.png"
        run(["sips", "-s", "format", "png", str(source), "--out", str(normalized)])
        convert_directly(normalized, target, width)


def convert_image(source: Path, target: Path, width: int) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)

    try:
        convert_directly(source, target, width)
    except subprocess.CalledProcessError:
        convert_via_png(source, target, width)


def main() -> None:
    generated = 0
    skipped = 0

    for source, target, width in iter_sources():
        if target.exists() and target.stat().st_mtime >= source.stat().st_mtime:
            skipped += 1
            continue

        convert_image(source, target, width)
        generated += 1

    print({"generated": generated, "skipped": skipped})


if __name__ == "__main__":
    if MIRROR_ROOT.exists():
        shutil.rmtree(MIRROR_ROOT)

    main()
