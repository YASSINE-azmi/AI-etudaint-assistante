"""Split a reviewed chapter (Markdown) into retrieval chunks by pedagogical unit (plan §9.4).

A unit starts at a recognised marker (activity, definition, property, example, remark,
worked method, solved exercise, exercise) and runs until the next marker. Units longer
than the token cap are split at blank lines, never inside a math block. Offsets point
into the original file so citations can be traced back.
"""

import hashlib
import re
from dataclasses import dataclass, field

from app.retrieval.normalize import search_text

MAX_TOKENS = 500
_IMAGE = re.compile(r"!\[[^\]]*\]\([^)]*\)")

# Part of the chapter a heading switches to.
_PARTS = [
    (re.compile(r"^#*\s*(le\s+)?contenu|objectifs|capacit|gapacit", re.I), "intro"),
    (re.compile(r"^#*\s*activit", re.I), "activities"),
    (re.compile(r"^#*\s*pour comprendre", re.I), "worked_methods"),
    (re.compile(r"^#*\s*le cours", re.I), "course"),
    (re.compile(r"^#*\s*exercices\s*<br>\s*r[ée]solus", re.I), "solved_exercises"),
    (re.compile(r"^#*\s*exercices\b", re.I), "exercises"),
]

# Line markers that start a new unit, with the content type they produce.
_MARKERS = [
    (re.compile(r"^activit[ée]\s+\d", re.I), "activity"),
    (re.compile(r"^d[ée]fin\w*ion\b", re.I), "definition"),
    (re.compile(r"^propri[ée]t[ée]", re.I), "property"),
    (re.compile(r"^exemples?\b", re.I), "example"),
    (re.compile(r"^remarque", re.I), "remark"),
    (re.compile(r"^l?infos?\b", re.I), "remark"),
    (re.compile(r"^exer[cg]ice\s+r[ée]sol", re.I), "solved_exercise"),
    (re.compile(r"^exercice\s*\(?\s*\d", re.I), "exercise"),
]
_PART_TYPE = {
    "activities": "activity",
    "worked_methods": "method",
    "solved_exercises": "solved_exercise",
    "exercises": "exercise",
}
_DECORATION = re.compile(r"^[#*\s]+|[#*\s]+$")
_NUMBERED_TITLE = re.compile(r"^\d+\.\s+([A-ZÀ-Ý][^$]{2,70})$")


@dataclass
class Chunk:
    chunk_id: str
    unit_id: str
    chunk_index: int
    content_type: str
    section_path: list[str]
    text: str
    search_text: str
    char_start: int
    char_end: int
    token_count: int
    content_hash: str


@dataclass
class _Unit:
    content_type: str
    section_path: list[str]
    start: int
    lines: list[tuple[int, str]] = field(default_factory=list)


def estimate_tokens(text: str) -> int:
    # ~4 characters per token for French prose; good enough for a size cap.
    return max(1, len(text) // 4)


def _bare(line: str) -> str:
    # OCR wraps headings in any mix of "#" and "**", e.g. "**## EXERCICE RESOLU 4**".
    return _DECORATION.sub("", line)


def _is_heading(line: str) -> bool:
    bare = _bare(line)
    return line.lstrip().startswith("#") or bare.isupper() or bool(_NUMBERED_TITLE.match(bare))


def _units(source: str, chapter_title: str) -> list[_Unit]:
    units: list[_Unit] = []
    part, section = "intro", ""
    current = _Unit("intro", [chapter_title, "intro"], 0)
    in_math = False
    offset = 0

    def start(content_type: str, at: int) -> None:
        nonlocal current
        path = [chapter_title, part] + ([section] if section else [])
        filled = [text for _, text in current.lines if text.strip()]
        if all(_is_heading(text) for text in filled):
            # A bare heading is context for what follows, not a chunk of its own.
            current = _Unit(content_type, path, current.start, current.lines)
            return
        units.append(current)
        current = _Unit(content_type, path, at)

    for line in source.splitlines(keepends=True):
        bare = _bare(line)
        if not in_math and bare:
            new_part = next((p for rx, p in _PARTS if rx.search(bare)), None)
            marker = next((t for rx, t in _MARKERS if rx.search(bare)), None)
            if part in ("exercises", "solved_exercises") and marker not in (
                "exercise",
                "solved_exercise",
            ):
                marker = None  # an "Exemple" inside an exercise belongs to that exercise
            titled = _NUMBERED_TITLE.match(bare)
            if new_part and line.lstrip().startswith("#") and marker is None:
                part, section = new_part, ""
                start(_PART_TYPE.get(part, part), offset)
            elif line.lstrip().startswith("## ") and marker is None and part != "intro":
                section = bare
                start("exercise" if part == "exercises" else "course", offset)
            elif marker:
                start(marker, offset)
            elif titled and part in ("course", "worked_methods"):
                section = titled.group(1).strip()
                start("method" if part == "worked_methods" else "course", offset)
        if line.count("$$") % 2 == 1:
            in_math = not in_math
        current.lines.append((offset, line))
        offset += len(line)
    start("end", offset)
    return units


def _split(unit: _Unit) -> list[list[tuple[int, str]]]:
    """Split an over-long unit outside math blocks, at blank lines when possible."""
    pieces: list[list[tuple[int, str]]] = [[]]
    in_math = False

    def size(lines: list[tuple[int, str]]) -> int:
        return estimate_tokens(_IMAGE.sub("[figure]", "".join(t for _, t in lines)))

    for item in unit.lines:
        _, text = item
        if not in_math and pieces[-1] and size([*pieces[-1], item]) > MAX_TOKENS:
            # No blank line came in time: cut at this line end rather than overflow.
            pieces.append([])
        if text.count("$$") % 2 == 1:
            in_math = not in_math
        pieces[-1].append(item)
        if not in_math and not text.strip() and size(pieces[-1]) >= MAX_TOKENS * 0.8:
            pieces.append([])
    return [p for p in pieces if any(t.strip() for _, t in p)]


def chunk_chapter(source: str, chapter_id: str, chapter_title: str) -> list[Chunk]:
    chunks: list[Chunk] = []
    for unit_no, unit in enumerate(_units(source, chapter_title), 1):
        unit_id = f"{chapter_id}-u{unit_no:03d}"
        for piece in _split(unit):
            raw = "".join(t for _, t in piece)
            text = _IMAGE.sub("[figure]", raw).strip()
            start = piece[0][0]
            chunks.append(
                Chunk(
                    chunk_id=f"{chapter_id}-c{len(chunks) + 1:03d}",
                    unit_id=unit_id,
                    chunk_index=len(chunks),
                    content_type=unit.content_type,
                    section_path=unit.section_path,
                    text=text,
                    search_text=search_text(text),
                    char_start=start,
                    char_end=start + len(raw),
                    token_count=estimate_tokens(text),
                    content_hash="sha256:" + hashlib.sha256(text.encode()).hexdigest(),
                )
            )
    return chunks
