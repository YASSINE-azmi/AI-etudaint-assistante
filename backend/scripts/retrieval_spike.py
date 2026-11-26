"""Week-1 retrieval/RRF spike: chunk one chapter, rank with lexical, semantic and RRF.

In memory only (no database): BM25 stands in for Postgres French full-text search and
NumPy-free cosine stands in for pgvector. Embeddings use the AI_PROVIDER_* settings.

    uv run python -m scripts.retrieval_spike ../data/sources/01_Chapitre_1_L_ensemble_N.md
    uv run python -m scripts.retrieval_spike <chapter.md> --lexical-only   # no API key needed

Chunk text and embeddings are cached under data/extracted/ (gitignored); only metrics
and chunk IDs are printed.
"""

import json
import math
import sys
from collections import Counter
from pathlib import Path

from openai import OpenAI

from app.config import get_settings
from app.retrieval.fusion import rrf
from app.retrieval.normalize import tokens
from ingest.chunking import Chunk, chunk_chapter

TOP_PER_CHANNEL = 20
QUERIES = Path(__file__).with_name("retrieval_spike_queries.json")
CACHE_DIR = Path(__file__).resolve().parents[2] / "data" / "extracted"


def bm25(chunks: list[Chunk], query: str, k1: float = 1.2, b: float = 0.75) -> list[str]:
    docs = [Counter(tokens(" ".join(c.section_path[2:]) + " " + c.text)) for c in chunks]
    avg = sum(sum(d.values()) for d in docs) / len(docs)
    df = Counter(t for d in docs for t in d)
    scores = []
    for chunk, doc in zip(chunks, docs, strict=True):
        length = sum(doc.values())
        s = 0.0
        for term in set(tokens(query)):
            if term in doc:
                idf = math.log(1 + (len(docs) - df[term] + 0.5) / (df[term] + 0.5))
                tf = doc[term]
                s += idf * tf * (k1 + 1) / (tf + k1 * (1 - b + b * length / avg))
        if s > 0:
            scores.append((s, chunk.chunk_id))
    scores.sort(key=lambda x: (-x[0], x[1]))
    return [cid for _, cid in scores[:TOP_PER_CHANNEL]]


def embed(client: OpenAI, model: str, texts: list[str]) -> list[list[float]]:
    out: list[list[float]] = []
    for i in range(0, len(texts), 64):
        resp = client.embeddings.create(model=model, input=texts[i : i + 64])
        out += [d.embedding for d in resp.data]
    return out


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    return dot / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)))


def chunk_vectors(client: OpenAI, model: str, chunks: list[Chunk]) -> dict[str, list[float]]:
    cache = CACHE_DIR / f"spike_embeddings_{model}.json"
    stored: dict[str, list[float]] = {}
    if cache.exists():
        stored = json.loads(cache.read_text(encoding="utf-8"))
    hashes = {c.chunk_id: c.content_hash for c in chunks}
    missing = [c for c in chunks if f"{c.chunk_id}|{hashes[c.chunk_id]}" not in stored]
    if missing:
        texts = [" > ".join(c.section_path) + "\n" + c.text for c in missing]
        for c, v in zip(missing, embed(client, model, texts), strict=True):
            stored[f"{c.chunk_id}|{c.content_hash}"] = v
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cache.write_text(json.dumps(stored), encoding="utf-8")
    return {c.chunk_id: stored[f"{c.chunk_id}|{c.content_hash}"] for c in chunks}


def metrics(ranked: list[list[str]], relevant: list[set[str]], k: int = 5) -> tuple[float, float]:
    hits, rr = 0, 0.0
    for ranking, rel in zip(ranked, relevant, strict=True):
        if any(c in rel for c in ranking[:k]):
            hits += 1
        rank = next((i for i, c in enumerate(ranking, 1) if c in rel), None)
        rr += 1 / rank if rank else 0.0
    return hits / len(ranked), rr / len(ranked)


def main(source: Path, lexical_only: bool) -> None:
    spec = json.loads(QUERIES.read_text(encoding="utf-8"))
    chunks = chunk_chapter(
        source.read_text(encoding="utf-8"), spec["chapter_id"], "Chapitre 1 - Ensemble N"
    )
    questions = [q["q"] for q in spec["queries"]]
    relevant = [set(q["relevant"]) for q in spec["queries"]]
    channels = {"lexical (BM25)": [bm25(chunks, q) for q in questions]}
    model = "none"
    if not lexical_only:
        settings = get_settings()
        client = OpenAI(
            base_url=settings.ai_provider_base_url, api_key=settings.ai_provider_api_key
        )
        model = settings.embedding_model_name
        vectors = chunk_vectors(client, model, chunks)
        channels["semantic"] = [
            sorted(vectors, key=lambda cid: (-cosine(qv, vectors[cid]), cid))[:TOP_PER_CHANNEL]
            for qv in embed(client, model, questions)
        ]
        channels["RRF"] = [
            [cid for cid, _ in rrf([lx, sm], k=settings.rrf_k)]
            for lx, sm in zip(channels["lexical (BM25)"], channels["semantic"], strict=True)
        ]

    print(f"chunks={len(chunks)} queries={len(questions)} embedding={model}")
    for name, ranked in channels.items():
        recall, mrr = metrics(ranked, relevant)
        print(f"{name:15} Recall@5={recall:.2f}  MRR={mrr:.2f}")
    print(f"\nrank of first relevant chunk ({' / '.join(channels)}); '-' = not in top 20")
    last = list(channels.values())[-1]
    for i, (q, rel) in enumerate(zip(questions, relevant, strict=True)):
        ranks = [
            next((str(r) for r, c in enumerate(ranked[i], 1) if c in rel), "-")
            for ranked in channels.values()
        ]
        print(f"{' / '.join(ranks):>10}  {q}  top5={[c[-4:] for c in last[i][:5]]}")


if __name__ == "__main__":
    main(Path(sys.argv[1]), lexical_only="--lexical-only" in sys.argv[2:])
