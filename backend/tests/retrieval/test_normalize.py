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


def test_order_symbols_absolute_value_and_signed_reals_become_words() -> None:
    assert search_text(r"si $c<0$ alors") == "si c negatif alors"
    assert search_text("a < b et b > 2") == "a inferieur b et b superieur 2"
    assert search_text(r"$|x y|=|x||y|$") == search_text(r"$\left|x y\right|=|x||y|$")
    assert "valeur absolue" in search_text("|x|")
    assert search_text(r"$\mathbb{R}^{+}$") == search_text("R+") == "reels positifs"
    assert search_text(r"$\mathbb{R}^{-}$") == search_text("R-") == "reels negatifs"
    assert search_text(r"$\mathbb{D}$") == "decimaux"


def test_ocr_line_breaks_are_not_read_as_inequalities() -> None:
    assert search_text("EXERCICES <br> RÉSOLUS") == "exercices resolus"
