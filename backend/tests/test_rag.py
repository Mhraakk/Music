from __future__ import annotations

from app.rag.chunking import chunk_text
from app.rag.embeddings import LocalHashEmbedder
from app.rag.parsing import parse_bytes, parse_text, unwrap_hard_wraps


class TestParsing:
    def test_unwraps_hard_wrapped_prose(self):
        raw = "This sentence was hard\nwrapped across lines.\n\n## Heading\n- item one"
        out = unwrap_hard_wraps(raw)
        assert "This sentence was hard wrapped across lines." in out
        assert "## Heading" in out
        assert "- item one" in out

    def test_strips_html_tags_and_scripts(self):
        doc = parse_text(
            "<html><title>T</title><script>evil()</script><p>Hello</p></html>", "text/html"
        )
        assert "evil()" not in doc.text
        assert "Hello" in doc.text
        assert doc.metadata["html_title"] == "T"

    def test_markdown_captures_headings(self):
        doc = parse_bytes("notes.md", b"# Alpha\n\nbody text here\n\n## Beta\n\nmore")
        assert doc.content_type == "text/markdown"
        assert "Alpha" in doc.metadata["headings"]


class TestChunking:
    def test_respects_size_and_produces_metadata(self):
        text = "# Title\n\n" + "\n\n".join(
            f"Paragraph number {i} with some content." for i in range(40)
        )
        chunks = chunk_text(text, chunk_size=300, overlap=50, base_metadata={"document_id": "d1"})
        assert len(chunks) > 1
        assert all(c.metadata["document_id"] == "d1" for c in chunks)
        assert all(len(c.text) <= 600 for c in chunks)

    def test_empty_text_yields_no_chunks(self):
        assert chunk_text("   \n  ") == []

    def test_tracks_section_heading(self):
        text = "# Intro\n\nfirst body paragraph\n\n## Details\n\nsecond body paragraph"
        chunks = chunk_text(text, chunk_size=60, overlap=0)
        sections = {c.metadata.get("section") for c in chunks}
        assert sections & {"Intro", "Details"}


class TestEmbeddings:
    def test_deterministic_and_normalized(self):
        emb = LocalHashEmbedder(dimension=64)
        a = emb.embed_one("emotional taste graph")
        b = emb.embed_one("emotional taste graph")
        assert a == b
        assert abs(sum(v * v for v in a) - 1.0) < 1e-6

    def test_similar_text_scores_higher_than_unrelated(self):
        emb = LocalHashEmbedder(dimension=256)
        query = emb.embed_one("how does rejection memory work")
        close = emb.embed_one("rejection memory stores a hard veto per track")
        far = emb.embed_one("cover artwork is served from a content delivery network")

        def dot(x, y):
            return sum(a * b for a, b in zip(x, y, strict=True))

        assert dot(query, close) > dot(query, far)

    def test_empty_text_returns_zero_vector(self):
        emb = LocalHashEmbedder(dimension=32)
        assert emb.embed_one("") == [0.0] * 32


class TestPipeline:
    def test_ingest_then_retrieve_returns_citations(self, container):
        result = container.rag.ingest_text(
            title="Test Doc",
            source="unit-test",
            text=(
                "# Widget policy\n\n"
                "The widget refresh interval is 42 seconds. "
                "Widgets are cached between refreshes to reduce load."
            ),
            content_type="text/markdown",
        )
        assert result.chunks >= 1

        retrieved = container.rag.retrieve("what is the widget refresh interval")
        assert not retrieved.is_empty
        assert "42 seconds" in retrieved.context
        assert retrieved.citations[0].ref == 1

    def test_retrieval_is_bounded_by_top_n(self, container):
        result = container.rag.retrieve("recommendation engine", top_k=12, top_n=2)
        assert len(result.chunks) <= 2

    def test_unknown_topic_returns_nothing_relevant(self, container):
        result = container.rag.retrieve("quantum chromodynamics lattice gauge theory")
        assert all(c.score < 0.5 for c in result.chunks)
