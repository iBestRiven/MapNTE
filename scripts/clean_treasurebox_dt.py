#!/usr/bin/env python3
# clean_treasurebox.py

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8-sig") as f:
        return json.load(f)


def find_rows(data: Any) -> dict[str, Any]:
    """
    兼容：
    1. UE DataTable 导出格式: [ { "Rows": {...} } ]
    2. 普通格式: { "Rows": {...} }
    """
    if isinstance(data, dict) and isinstance(data.get("Rows"), dict):
        return data["Rows"]

    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict) and isinstance(item.get("Rows"), dict):
                return item["Rows"]

    raise ValueError("没有找到 Rows 字段")


def is_valid_location(value: Any) -> bool:
    return (
        isinstance(value, dict)
        and "X" in value
        and "Y" in value
        and "Z" in value
    )


def clean_rows(rows: dict[str, Any]) -> list[dict[str, Any]]:
    cleaned = []

    for name, value in rows.items():
        if not isinstance(value, dict):
            continue

        location = value.get("Location")
        if not is_valid_location(location):
            continue

        cleaned.append(
            {
                "name": name,
                "index": value.get("Index"),
                "AreaId": value.get("AreaId"),
                "location": {
                    "X": location["X"],
                    "Y": location["Y"],
                    "Z": location["Z"],
                },
            }
        )

    cleaned.sort(
        key=lambda item: (
            item["index"] is None,
            item["index"] if isinstance(item["index"], int) else 10**18,
            item["name"],
        )
    )

    return cleaned


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", help="输入 JSON 文件")
    parser.add_argument(
        "-o",
        "--output",
        default="cleaned_treasurebox.json",
        help="输出 JSON 文件",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    data = load_json(input_path)
    rows = find_rows(data)
    cleaned = clean_rows(rows)

    with output_path.open("w", encoding="utf-8") as f:
        json.dump(cleaned, f, ensure_ascii=False, indent=2)

    print(f"[OK] 原始 Rows 数量: {len(rows)}")
    print(f"[OK] 清洗后数量: {len(cleaned)}")
    print(f"[OK] 输出文件: {output_path}")


if __name__ == "__main__":
    main()