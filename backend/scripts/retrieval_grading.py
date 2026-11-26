"""Reviewer grading sheet for the labeled retrieval set (plan §10.5, Week-2 task).

    uv run python -m scripts.retrieval_grading export --models-dir <path>
    uv run python -m scripts.retrieval_grading import <grading.csv>

export: for each query, the top 5 RRF chunks plus every chunk already graded, one row
each, with an excerpt. Written under data/extracted/ (gitignored: excerpts quote the book).
import: reads the reviewer's 0/1/2 grades back into scripts/retrieval_spike_queries/.
"""

import csv
import json
import sys
from datetime import UTC, datetime
from pathlib import Path

from fastembed import TextEmbedding

from scripts.retrieval_spike import CACHE_DIR, MODELS_DIR, QUERIES_DIR, rank_chapter

MODEL = "intfloat/multilingual-e5-large"
TOP = 5
EXCERPT_CHARS = 300
COLUMNS = ["chapter_id", "query_no", "split", "objective_id", "query"]
COLUMNS += ["chunk_id", "rrf_rank", "content_type", "section", "excerpt", "grade"]


def export(models_dir: Path) -> Path:
    model = TextEmbedding(model_name=MODEL, cache_dir=str(models_dir))
    rows = []
    for path in sorted(QUERIES_DIR.glob("*.json")):
        spec, chunks, channels = rank_chapter(path.stem, [model])
        by_id = {c.chunk_id: c for c in chunks}
        fused = channels[f"RRF {MODEL.split('/')[-1]}"]
        for n, query in enumerate(spec["queries"]):
            shown = list(dict.fromkeys(fused[n][:TOP] + list(query["grades"])))
            for cid in shown:
                chunk = by_id[cid]
                rank = fused[n].index(cid) + 1 if cid in fused[n] else ""
                rows.append(
                    {
                        "chapter_id": path.stem,
                        "query_no": n,
                        "split": query["split"],
                        "objective_id": query["objective_id"],
                        "query": query["q"],
                        "chunk_id": cid,
                        "rrf_rank": rank,
                        "content_type": chunk.content_type,
                        "section": " > ".join(chunk.section_path[2:]),
                        "excerpt": " ".join(chunk.text.split())[:EXCERPT_CHARS],
                        "grade": query["grades"].get(cid, ""),
                    }
                )
    out = CACHE_DIR / "retrieval_grading" / f"{datetime.now(UTC):%Y%m%dT%H%M%SZ}.csv"
    out.parent.mkdir(parents=True, exist_ok=True)
    # utf-8-sig so Excel opens the French text correctly.
    with out.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)
    return out


def import_grades(sheet: Path) -> int:
    with sheet.open(encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    if missing := [r["chunk_id"] for r in rows if r["grade"].strip() not in ("0", "1", "2")]:
        sys.exit(f"{len(missing)} rows have no 0/1/2 grade, e.g. {missing[0]}")
    graded = 0
    for path in sorted(QUERIES_DIR.glob("*.json")):
        spec = json.loads(path.read_text(encoding="utf-8"))
        for n, query in enumerate(spec["queries"]):
            mine = [r for r in rows if r["chapter_id"] == path.stem and int(r["query_no"]) == n]
            if mine:
                query["grades"] = {r["chunk_id"]: int(r["grade"]) for r in mine}
                graded += len(mine)
        path.write_text(json.dumps(spec, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return graded


if __name__ == "__main__":
    args = sys.argv[1:]
    if args[:1] == ["export"]:
        md = Path(args[args.index("--models-dir") + 1]) if "--models-dir" in args else MODELS_DIR
        print(f"grading sheet: {export(md)}")
    elif args[:1] == ["import"] and len(args) == 2:
        print(f"imported {import_grades(Path(args[1]))} grades")
    else:
        sys.exit(__doc__)
