import json
import re
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
PDF_PATH = Path("/Users/giladcohental/Downloads/פנקס מלרד חדש.pdf")


def _clean_text(s: str) -> str:
    s = s.replace("\r", "\n")
    s = re.sub(r"[ \t]+\n", "\n", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()


def extract_pages(pdf_path: Path) -> list[dict]:
    reader = PdfReader(str(pdf_path))
    pages: list[dict] = []
    for i, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        pages.append(
            {
                "pageNumber": i,
                "text": _clean_text(text),
            }
        )
    return pages


TOC_LINE_RE = re.compile(r"^\s*(\d{1,3})\s*(\S.+?)\s*$")


def parse_toc(pages: list[dict]) -> list[dict]:
    # The TOC is on the first page in this PDF; still, we scan the first ~3 pages
    # to be resilient to formatting differences.
    scan_text = "\n".join(p["text"] for p in pages[:3] if p.get("text"))
    lines = [ln.strip() for ln in scan_text.split("\n") if ln.strip()]

    entries: list[dict] = []
    current_category: str | None = None

    for ln in lines:
        m = TOC_LINE_RE.match(ln)
        if m:
            page_num = int(m.group(1))
            title = m.group(2)
            # Skip obvious non-TOC lines that happen to start with numbers.
            if page_num <= 0 or page_num > len(pages):
                continue
            entries.append(
                {
                    "category": current_category or "כללי",
                    "title": title,
                    "startPage": page_num,
                }
            )
            continue

        # Category headings appear as standalone words/phrases.
        # Ignore the cover and boilerplate.
        if any(
            bad in ln
            for bad in (
                "Schneider",
                "logo",
                "פנקס פרוטוקולים",
                "לחזרה לתוכן העניינים",
            )
        ):
            continue
        # Heuristic: short-ish line without digits/punctuation.
        if not re.search(r"\d", ln) and len(ln) <= 30:
            current_category = ln

    # Sort by page, keep first occurrence per (startPage,title)
    seen: set[tuple[int, str]] = set()
    out: list[dict] = []
    for e in sorted(entries, key=lambda x: x["startPage"]):
        key = (e["startPage"], e["title"])
        if key in seen:
            continue
        seen.add(key)
        out.append(e)
    return out


def build_protocols(pages: list[dict], toc: list[dict]) -> list[dict]:
    protocols: list[dict] = []
    for idx, entry in enumerate(toc):
        start = entry["startPage"]
        end = toc[idx + 1]["startPage"] - 1 if idx + 1 < len(toc) else len(pages)
        chunk = "\n\n".join(
            f"עמוד {p['pageNumber']}\n{p['text']}".strip()
            for p in pages[start - 1 : end]
            if p.get("text")
        ).strip()
        protocols.append(
            {
                "id": f"p{start:03d}",
                "category": entry["category"],
                "title": entry["title"],
                "startPage": start,
                "endPage": end,
                "content": chunk,
            }
        )
    return protocols


def main() -> None:
    data_dir = ROOT / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    pages = extract_pages(PDF_PATH)
    toc = parse_toc(pages)
    protocols = build_protocols(pages, toc)

    (data_dir / "malrad_pages.json").write_text(
        json.dumps(
            {
                "sourcePdf": str(PDF_PATH),
                "pageCount": len(pages),
                "pages": pages,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    (data_dir / "malrad_toc.json").write_text(
        json.dumps({"entries": toc}, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (data_dir / "malrad_protocols.json").write_text(
        json.dumps({"protocols": protocols}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Wrote {len(pages)} pages, {len(toc)} toc entries, {len(protocols)} protocols")


if __name__ == "__main__":
    main()

