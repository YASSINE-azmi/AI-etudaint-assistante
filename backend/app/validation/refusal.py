"""Stable refusal codes and French templates (plan §7.4, §8.7).

The model never writes refusal text: the server picks one of these templates by code.
The French wording is a draft until the mathematics reviewer approves it.
"""

from dataclasses import dataclass
from enum import StrEnum
from typing import Literal

REFUSAL_TEMPLATES_VERSION = "refusal-fr-v0.1-draft"


class EducationalStatus(StrEnum):
    ACCEPTED = "accepted"
    OUTSIDE_SCOPE = "outside_scope"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"
    CLARIFICATION_REQUIRED = "clarification_required"
    VALIDATION_FAILED = "validation_failed"
    SOURCE_WITHDRAWN = "source_withdrawn"
    PROVIDER_UNAVAILABLE = "provider_unavailable"
    CREDIT_EXHAUSTED = "credit_exhausted"
    CANCELLED = "cancelled"


class RefusalCode(StrEnum):
    OUT_OF_SCOPE_LEVEL = "OUT_OF_SCOPE_LEVEL"
    OUT_OF_SCOPE_CHAPTER = "OUT_OF_SCOPE_CHAPTER"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"
    AMBIGUOUS_QUESTION = "AMBIGUOUS_QUESTION"
    MATH_UNVERIFIABLE = "MATH_UNVERIFIABLE"
    MATH_INCORRECT = "MATH_INCORRECT"
    RENDERING_UNSAFE = "RENDERING_UNSAFE"
    SOURCE_WITHDRAWN = "SOURCE_WITHDRAWN"
    PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE"
    CREDIT_EXHAUSTED = "CREDIT_EXHAUSTED"
    RATE_LIMITED = "RATE_LIMITED"
    TURN_LIMIT_REACHED = "TURN_LIMIT_REACHED"


# How each code reaches the student:
# - "refusal": a completed turn; the stream ends with message.final carrying the template.
# - "failure": a failed turn; the stream ends with turn.failed and carries no text.
# - "http": rejected before a turn row exists (429/409); no stream at all.
Delivery = Literal["refusal", "failure", "http"]


@dataclass(frozen=True)
class RefusalTemplate:
    code: RefusalCode
    educational_status: EducationalStatus | None
    delivery: Delivery
    retryable: bool
    message_fr: str


_S = EducationalStatus
_C = RefusalCode

REFUSALS: dict[RefusalCode, RefusalTemplate] = {
    t.code: t
    for t in (
        RefusalTemplate(
            _C.OUT_OF_SCOPE_LEVEL,
            _S.OUTSIDE_SCOPE,
            "refusal",
            False,
            "Cette question dépasse le programme du Tronc Commun Scientifique. "
            "Choisis une notion d'un chapitre disponible et je t'explique pas à pas.",
        ),
        RefusalTemplate(
            _C.OUT_OF_SCOPE_CHAPTER,
            _S.OUTSIDE_SCOPE,
            "refusal",
            False,
            "Ce chapitre n'est pas encore disponible dans cette version. "
            "Choisis l'un des chapitres proposés dans la liste.",
        ),
        RefusalTemplate(
            _C.INSUFFICIENT_EVIDENCE,
            _S.INSUFFICIENT_EVIDENCE,
            "refusal",
            False,
            "Le manuel validé ne contient pas assez d'éléments pour répondre à cette question. "
            "Reformule-la ou pose une question sur une notion du chapitre.",
        ),
        RefusalTemplate(
            _C.AMBIGUOUS_QUESTION,
            _S.CLARIFICATION_REQUIRED,
            "refusal",
            False,
            "Je ne suis pas sûr de bien lire ta question. "
            "Peux-tu préciser l'expression ou le symbole concerné ?",
        ),
        RefusalTemplate(
            _C.MATH_UNVERIFIABLE,
            _S.VALIDATION_FAILED,
            "refusal",
            False,
            "Je n'arrive pas à vérifier ce calcul avec certitude, donc je préfère ne pas répondre. "
            "Peux-tu préciser l'énoncé ?",
        ),
        RefusalTemplate(
            _C.MATH_INCORRECT,
            _S.VALIDATION_FAILED,
            "refusal",
            False,
            "La réponse préparée n'a pas passé la vérification mathématique, "
            "elle n'est donc pas affichée. Reformule ta question ou essaie une autre notion.",
        ),
        RefusalTemplate(
            _C.RENDERING_UNSAFE,
            _S.VALIDATION_FAILED,
            "refusal",
            False,
            "La réponse contient une notation mathématique qui ne peut pas être affichée "
            "correctement. Reformule ta question.",
        ),
        RefusalTemplate(
            _C.SOURCE_WITHDRAWN,
            _S.SOURCE_WITHDRAWN,
            "refusal",
            False,
            "La source de cette séance a été retirée. L'historique reste consultable ; "
            "ouvre une nouvelle séance pour continuer.",
        ),
        RefusalTemplate(
            _C.PROVIDER_UNAVAILABLE,
            _S.PROVIDER_UNAVAILABLE,
            "failure",
            True,
            "Le service est momentanément indisponible. Ta séance est conservée ; réessaie "
            "dans un instant.",
        ),
        RefusalTemplate(
            _C.CREDIT_EXHAUSTED,
            _S.CREDIT_EXHAUSTED,
            "failure",
            False,
            "Les crédits de démonstration sont épuisés. Cette version de démonstration "
            "ne peut plus répondre pour le moment.",
        ),
        RefusalTemplate(
            _C.RATE_LIMITED,
            None,
            "http",
            True,
            "Tu envoies trop de questions à la suite. Attends quelques secondes puis réessaie.",
        ),
        RefusalTemplate(
            _C.TURN_LIMIT_REACHED,
            None,
            "http",
            False,
            "Cette séance a atteint sa limite de questions. Ouvre une nouvelle séance pour "
            "continuer.",
        ),
    )
}
