from pathlib import Path

from ingest import chunking
from ingest.chunking import chunk_chapter

# Synthetic chapter written for tests; not textbook content.
SOURCE = """## Chapitre test

## Objectifs

- Connaître les carrés.

## Le COURS

1. Les carrés

**DÉFINITION**
Le carré de $n$ est $n^{2}$.

**Exemple**: $3^{2}=9$.

## EXERCICES

Exercice 1 : Calculer $4^{2}$.

Exercice 2 : Calculer $5^{2}$.
**Exemple**: $2^{2}=4$.
"""


def _chunks() -> list[chunking.Chunk]:
    return chunk_chapter(SOURCE, "test_ch", "Chapitre test")


def test_units_follow_pedagogical_markers() -> None:
    assert [c.content_type for c in _chunks()] == [
        "intro",
        "definition",
        "example",
        "exercise",
        "exercise",
    ]


def test_bare_headings_join_the_unit_after_them() -> None:
    definition = _chunks()[1]
    assert definition.text.startswith("## Le COURS")
    assert definition.section_path == ["Chapitre test", "course", "Les carrés"]


def test_an_example_inside_an_exercise_stays_with_it() -> None:
    last = _chunks()[-1]
    assert "Exercice 2" in last.text and "2^{2}=4" in last.text


def test_offsets_cover_the_source_without_gaps() -> None:
    chunks = _chunks()
    assert "".join(SOURCE[c.char_start : c.char_end] for c in chunks) == SOURCE
    assert [c.chunk_index for c in chunks] == list(range(len(chunks)))


def test_long_units_split_at_blank_lines_never_inside_math(monkeypatch) -> None:
    monkeypatch.setattr(chunking, "MAX_TOKENS", 20)
    math_block = "$$\n" + "\n\n".join(["a+b=c"] * 20) + "\n$$\n"
    source = "## Le COURS\n\n**DÉFINITION**\n" + "mot " * 60 + "\n\n" + math_block
    chunks = chunk_chapter(source, "t", "T")
    assert len(chunks) > 1
    assert all(c.text.count("$$") % 2 == 0 for c in chunks)
    assert len({c.unit_id for c in chunks}) == 1


def test_images_become_a_placeholder() -> None:
    chunks = chunk_chapter("## Le COURS\n\n**DÉFINITION**\nvoir ![](https://x/y.jpg)\n", "t", "T")
    assert chunks[0].text.endswith("voir [figure]")


def test_markers_wrapped_in_bold_and_hashes_still_start_a_unit() -> None:
    source = (
        "## EXERCICES <br> RÉSOLUS\n\n**EXERCICE RESOLU 1**\nun\n\n**## EXERCICE RESOLU 2**\ndeux\n"
    )
    chunks = chunk_chapter(source, "t", "T")
    assert [c.text.splitlines()[-1] for c in chunks] == ["un", "deux"]


def test_a_heading_only_part_gets_a_singular_content_type() -> None:
    source = "## ACTIVITES\n\nUne situation sans numéro.\n\n## LE COURS\n\n**DÉFINITION**\nX\n"
    assert chunk_chapter(source, "t", "T")[0].content_type == "activity"


def test_a_long_unit_without_blank_lines_is_still_split(monkeypatch) -> None:
    monkeypatch.setattr(chunking, "MAX_TOKENS", 20)
    source = "## Le COURS\n\n**DÉFINITION**\n" + "une ligne de texte\n" * 40
    chunks = chunk_chapter(source, "t", "T")
    assert len(chunks) > 1 and all(c.token_count <= 25 for c in chunks)


def test_content_types_are_the_ones_the_retrieval_schema_lists() -> None:
    assert {c.content_type for c in _chunks()} <= set(chunking.CONTENT_TYPES)
    spec = Path(__file__).resolve().parents[3] / "docs" / "contracts" / "retrieval-schema.md"
    section = spec.read_text(encoding="utf-8").split("## 4.")[1].split("## 5.")[0]
    listed = [line.split("`")[1] for line in section.splitlines() if line.startswith("| `")]
    assert listed == list(chunking.CONTENT_TYPES)


def test_schema_embedding_matches_the_pinned_settings() -> None:
    from app.config import Settings

    spec = Path(__file__).resolve().parents[3] / "docs" / "contracts" / "retrieval-schema.md"
    text = spec.read_text(encoding="utf-8")
    fields = Settings.model_fields
    assert f"vector({fields['embedding_dimensions'].default})" in text
    assert f"`{fields['embedding_model_name'].default}`" in text


def test_bracket_and_environment_math_blocks_are_never_split(monkeypatch) -> None:
    monkeypatch.setattr(chunking, "MAX_TOKENS", 20)
    lines = "\n".join([r"a+b=c \\"] * 20)
    bracket = "\\[\n" + lines + "\n\\]\n"
    environment = "$\\begin{array}{l}\n" + lines + "\n\\end{array}$\n"
    for block in (bracket, environment):
        source = "## Le COURS\n\n**DÉFINITION**\n" + "mot " * 60 + "\n\n" + block
        chunks = chunk_chapter(source, "t", "T")
        assert len(chunks) > 1
        assert any(block.strip() in c.text for c in chunks)


def test_a_marker_inside_a_math_block_does_not_start_a_unit() -> None:
    source = "## Le COURS\n\n**DÉFINITION**\n\\[\nExemple\n\\]\n"
    assert [c.content_type for c in chunk_chapter(source, "t", "T")] == ["definition"]


def test_tables_are_never_split(monkeypatch) -> None:
    monkeypatch.setattr(chunking, "MAX_TOKENS", 20)
    table = "| n | carré |\n| --- | --- |\n" + "".join(f"| {n} | {n * n} |\n" for n in range(30))
    source = "## Le COURS\n\n**DÉFINITION**\n" + "mot " * 60 + "\n\n" + table
    assert any(table.strip() in c.text for c in chunk_chapter(source, "t", "T"))


def test_chunks_of_a_unit_are_contiguous_and_share_type_and_path(monkeypatch) -> None:
    monkeypatch.setattr(chunking, "MAX_TOKENS", 20)
    source = SOURCE.replace("Le carré de $n$", "mot " * 80 + "\n\nLe carré de $n$")
    chunks = chunk_chapter(source, "t", "T")
    seen: list[str] = []
    for c in chunks:
        if not seen or seen[-1] != c.unit_id:
            assert c.unit_id not in seen, "a unit's chunks must be contiguous"
            seen.append(c.unit_id)
    by_unit = {c.unit_id: (c.content_type, c.section_path) for c in chunks}
    assert all(by_unit[c.unit_id] == (c.content_type, c.section_path) for c in chunks)
    assert len(chunks) > len(by_unit)
