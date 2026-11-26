"""Week-1 retrieval/RRF spike: chunk one chapter, rank with lexical, semantic and RRF.

In memory only (no database): BM25 stands in for Postgres French full-text search and
cosine stands in for pgvector. Embeddings run locally through fastembed (ONNX); model
weights download once into data/models/ (gitignored).

    uv run python -m scripts.retrieval_spike <chapter.md> --lexical-only
    uv run python -m scripts.retrieval_spike <chapter.md> --model <hf-model> [--model ...]
    (add --models-dir <path> to keep weights outside a synced folder such as OneDrive)

Chunk text and embeddings are cached under data/extracted/ (gitignored); only metrics
and chunk IDs are printed.
"""

import json
import math
import sys
import time
from collections import Counter
from pathlib import Path

from fastembed import TextEmbedding

from app.retrieval.fusion import rrf
from app.retrieval.normalize import tokens
from ingest.chunking import Chunk, chunk_chapter

TOP_PER_CHANNEL = 20
QUERIES = Path(__file__).with_name("retrieval_spike_queries.json")
DATA = Path(__file__).resolve().parents[2] / "data"
CACHE_DIR = DATA / "extracted"
MODELS_DIR = DATA / "models"
RRF_K = 60


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


def embed(model: TextEmbedding, texts: list[str], kind: str) -> list[list[float]]:
    # E5 models are trained with "query: " / "passage: " prefixes; others take raw text.
    if "e5" in model.model_name.lower():
        texts = [f"{kind}: {t}" for t in texts]
    return [v.tolist() for v in model.embed(texts, batch_size=16)]


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    return dot / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)))


def chunk_vectors(model: TextEmbedding, chunks: list[Chunk]) -> dict[str, list[float]]:
    cache = CACHE_DIR / f"spike_embeddings_{model.model_name.replace('/', '__')}.json"
    stored: dict[str, list[float]] = {}
    if cache.exists():
        stored = json.loads(cache.read_text(encoding="utf-8"))
    hashes = {c.chunk_id: c.content_hash for c in chunks}
    missing = [c for c in chunks if f"{c.chunk_id}|{hashes[c.chunk_id]}" not in stored]
    if missing:
        texts = [" > ".join(c.section_path) + "\n" + c.text for c in missing]
        for c, v in zip(missing, embed(model, texts, "passage"), strict=True):
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


def main(source: Path, models: list[str], models_dir: Path) -> None:
    spec = json.loads(QUERIES.read_text(encoding="utf-8"))
    chunks = chunk_chapter(
        source.read_text(encoding="utf-8"), spec["chapter_id"], "Chapitre 1 - Ensemble N"
    )
    questions = [q["q"] for q in spec["queries"]]
    relevant = [set(q["relevant"]) for q in spec["queries"]]
    lexical = [bm25(chunks, q) for q in questions]
    channels = {"lexical (BM25)": lexical}
    for name in models:
        started = time.perf_counter()
        model = TextEmbedding(model_name=name, cache_dir=str(models_dir))
        vectors = chunk_vectors(model, chunks)
        qvecs = embed(model, questions, "query")
        elapsed = time.perf_counter() - started
        short = name.split("/")[-1]
        semantic = [
            sorted(vectors, key=lambda cid: (-cosine(qv, vectors[cid]), cid))[:TOP_PER_CHANNEL]
            for qv in qvecs
        ]
        channels[f"semantic {short}"] = semantic
        channels[f"RRF {short}"] = [
            [cid for cid, _ in rrf([lx, sm], k=RRF_K)]
            for lx, sm in zip(lexical, semantic, strict=True)
        ]
        dims = len(next(iter(vectors.values())))
        print(f"{short}: dims={dims} load+embed={elapsed:.1f}s")

    print(f"chunks={len(chunks)} queries={len(questions)}")
    for name, ranked in channels.items():
        recall, mrr = metrics(ranked, relevant)
        print(f"{name:40} Recall@5={recall:.2f}  MRR={mrr:.2f}")
    print("\nrank of first relevant chunk per channel, in the order above; '-' = not in top 20")
    for i, (q, rel) in enumerate(zip(questions, relevant, strict=True)):
        ranks = [
            next((str(r) for r, c in enumerate(ranked[i], 1) if c in rel), "-")
            for ranked in channels.values()
        ]
        print(f"{' / '.join(ranks):>22}  {q}")


if __name__ == "__main__":
    args = sys.argv[1:]
    chosen = [args[i + 1] for i, a in enumerate(args) if a == "--model"]
    if not chosen and "--lexical-only" not in args:
        sys.exit("pass --lexical-only or at least one --model <hf-model>")
    md = next((args[i + 1] for i, a in enumerate(args) if a == "--models-dir"), None)
    main(Path(args[0]), chosen, Path(md) if md else MODELS_DIR)
