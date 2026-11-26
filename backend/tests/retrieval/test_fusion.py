from app.retrieval.fusion import rrf


def test_chunk_ranked_high_in_both_lists_wins() -> None:
    fused = rrf([["a", "b", "c"], ["b", "a", "d"]])
    assert [cid for cid, _ in fused][:2] == ["a", "b"]  # tie on score, broken by ID
    assert fused[0][1] == fused[1][1] == 1 / 61 + 1 / 62


def test_uses_one_based_ranks_and_k() -> None:
    assert rrf([["x"]], k=60) == [("x", 1 / 61)]


def test_duplicate_within_one_list_counts_once_at_best_rank() -> None:
    assert rrf([["x", "x", "y"]]) == [("x", 1 / 61), ("y", 1 / 63)]


def test_ties_break_by_chunk_id_deterministically() -> None:
    assert [cid for cid, _ in rrf([["b"], ["a"]])] == ["a", "b"]


def test_chunk_in_one_list_only_still_ranks() -> None:
    fused = dict(rrf([["a", "b"], ["c"]]))
    assert set(fused) == {"a", "b", "c"}
