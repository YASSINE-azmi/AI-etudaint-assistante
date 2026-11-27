import json
import re
from pathlib import Path

import pytest

from app.retrieval.normalize import strip_accents
from ingest.chunking import MAX_TOKENS, Chunk, chunk_chapter

ROOT = Path(__file__).resolve().parents[3]
SEED = ROOT / "data" / "seed"
SOURCES = ROOT / "data" / "sources"
MATRIX = ROOT / "docs" / "curriculum" / "coverage-matrix.json"
SHINGLE = 8  # an 8-word run shared with the book counts as copied text
_EXERCISE = re.compile(r"Exercice\s*\(?(\d+)")


def _seed() -> list[tuple[dict, list[Chunk]]]:
    manifest = json.loads((SEED / "manifest.json").read_text(encoding="utf-8"))
    return [
        (
            c,
            chunk_chapter(
                (SEED / c["file"]).read_text(encoding="utf-8"), c["chapter_id"], c["title"]
            ),
        )
        for c in manifest["chapters"]
    ]


def _objectives(chapter: dict, chunk: Chunk) -> list[str]:
    if chunk.content_type == "intro":
        return []
    if chunk.content_type == "exercise":
        number = _EXERCISE.search(chunk.text)
        return chapter["exercises"].get(number.group(1), []) if number else []
    return chapter["sections"].get(chunk.section_path[2], []) if len(chunk.section_path) > 2 else []


def test_seed_chunks_cleanly_and_every_teaching_chunk_maps_to_its_chapter() -> None:
    for chapter, chunks in _seed():
        assert chunks and all(c.token_count <= MAX_TOKENS for c in chunks)
        assert all(c.text.count("$$") % 2 == 0 for c in chunks)
        for chunk in chunks:
            objectives = _objectives(chapter, chunk)
            if chunk.content_type != "intro":
                assert objectives, f"{chunk.chunk_id} ({chunk.content_type}) maps to no objective"
            assert all(o.startswith(chapter["chapter_id"] + "_o") for o in objectives)


def test_seed_covers_every_objective_of_the_coverage_matrix() -> None:
    matrix = json.loads(MATRIX.read_text(encoding="utf-8"))
    wanted = {o["id"] for c in matrix["chapters"] for o in c["objectives"]}
    covered = {o for chapter, chunks in _seed() for ch in chunks for o in _objectives(chapter, ch)}
    assert covered == wanted


def _shingles(text: str) -> set[tuple[str, ...]]:
    # Prose only: a formula such as a^2 - b^2 = (a - b)(a + b) is a fact with one way to write it.
    prose = re.sub(r"\$\$.*?\$\$|\$[^$]*\$", " | ", text, flags=re.S)
    words = re.findall(r"\w+|\|", strip_accents(prose.lower()))
    runs = (tuple(words[i : i + SHINGLE]) for i in range(len(words) - SHINGLE + 1))
    return {run for run in runs if "|" not in run}


@pytest.mark.skipif(not any(SOURCES.glob("*.md")), reason="textbook sources are local only")
def test_seed_shares_no_long_run_of_words_with_the_textbook() -> None:
    book = set().union(*(_shingles(p.read_text(encoding="utf-8")) for p in SOURCES.glob("*.md")))
    for path in SEED.glob("*.md"):
        copied = _shingles(path.read_text(encoding="utf-8")) & book
        assert not copied, f"{path.name} repeats textbook text: {' '.join(sorted(copied)[0])}"
