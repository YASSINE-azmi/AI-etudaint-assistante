import pytest

from app.retrieval.normalize import search_text, tokens


@pytest.mark.parametrize("written", ["x au carré", "x²", "$x^{2}$", "x^2"])
def test_squares_meet_in_one_form(written: str) -> None:
    assert search_text(written) == "x carre"


@pytest.mark.parametrize(
    ("written", "word"),
    [
        ("$\\sqrt{2}$", "racine"),
        ("racine de 2", "racine"),
        ("$a \\leqslant b$", "inferieur egal"),
        ("a inférieur ou égal à b", "inferieur egal"),
        ("$\\operatorname{PGCD}(a ; b)$", "pgcd"),
        ("$P G C D(12 ; 15)$", "pgcd"),
        ("le plus grand commun diviseur", "pgcd"),
        ("le plus petit multiple commun", "ppcm"),
        ("$\\mathbb{N}$", "entiers naturels"),
    ],
)
def test_math_notation_and_spoken_forms_normalise(written: str, word: str) -> None:
    assert word in search_text(written)


def test_accents_case_and_plurals_fold_for_matching() -> None:
    assert tokens("Les Diviseurs PREMIERS") == tokens("diviseur premier")


def test_curly_apostrophe_matches_straight_and_numbers_survive() -> None:
    assert search_text("l" + chr(0x2019) + "ensemble 2019") == "l'ensemble 2019"


def test_stopwords_are_dropped_but_numbers_kept() -> None:
    assert tokens("c'est quoi un multiple de 9 ?") == ["multiple", "9"]
