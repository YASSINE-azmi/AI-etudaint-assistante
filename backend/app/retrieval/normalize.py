"""Search normalisation shared by chunks and queries (plan §10.2).

Both sides go through the same function so "x au carré", "x²", "x^{2}" and "$x^2$" all
become "x carre". Display text is never modified; this is for matching only.
"""

import re
import unicodedata

# Spoken or written math -> one canonical word. Data, not branches: the reviewer extends it.
MATH_WORDS: dict[str, str] = {
    r"\\mathbb\{n\}\^?\{?\*\}?": " entiers naturels ",
    r"\\mathbb\{n\}": " entiers naturels ",
    r"\\mathbb\{z\}": " entiers relatifs ",
    r"\\mathbb\{q\}": " rationnels ",
    r"\\mathbb\{r\}": " reels ",
    r"\\operatorname\{(\w+)\}": r" \1 ",
    r"\\sqrt": " racine ",
    r"√": " racine ",
    r"racine carree de|racine de": " racine ",
    r"\\frac": " fraction ",
    r"\\times|\u00d7": " fois ",
    r"\\leqslant|\\leq|≤|inferieur ou egal a?": " inferieur egal ",
    r"\\geqslant|\\geq|≥|superieur ou egal a?": " superieur egal ",
    r"\\in\b|∈|appartient a": " appartient ",
    r"\^\{?2\}?|²|au carre": " carre ",
    r"\^\{?3\}?|³|au cube": " cube ",
    r"\bp\s*g\s*c\s*d\b|plus grand commun diviseur|plus grand diviseur commun": " pgcd ",
    r"\bp\s*p\s*c\s*m\b|plus petit commun multiple|plus petit multiple commun": " ppcm ",
}
_MATH = [(re.compile(p), r) for p, r in MATH_WORDS.items()]

_STOPWORDS = """
a au aux avec c ce ces cette d dans de des du elle en est et etre il ils je l la le les
leur lui m ma mais me meme mes moi mon n ne nos notre nous on ou par pas pour qu que qui
s sa se ses si son sont sur t ta te tes toi ton tu un une vos votre vous y c'est quoi quel
quelle quels quelles comment est-ce alors donc car
"""
STOPWORDS = frozenset(_STOPWORDS.split())


def strip_accents(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")


def search_text(text: str) -> str:
    out = strip_accents(text.lower()).replace(chr(0x2019), "'")
    for rx, repl in _MATH:
        out = rx.sub(repl, out)
    out = re.sub(r"\\[a-z]+", " ", out)  # remaining LaTeX commands
    out = re.sub(r"[^a-z0-9' ]+", " ", out)
    return re.sub(r"\s+", " ", out).strip()


def _stem(token: str) -> str:
    # Light French plural folding: "diviseurs" -> "diviseur", "premiers" -> "premier".
    if len(token) > 3 and token[-1] in "sx":
        return token[:-1]
    return token


def tokens(text: str) -> list[str]:
    words = search_text(text).replace("'", " ").split()
    return [_stem(w) for w in words if (w not in STOPWORDS and len(w) > 1) or w.isdigit()]
