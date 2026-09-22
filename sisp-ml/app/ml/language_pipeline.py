"""Shared scikit-learn pipeline for short, multilingual ARIA queries."""

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import FeatureUnion, Pipeline


def build_language_pipeline() -> Pipeline:
    """Build a language identifier that tolerates spelling and code-switching.

    Character n-grams receive more weight than word n-grams because the six
    supported languages share many school terms and common short words.
    """
    features = FeatureUnion(
        [
            (
                "word",
                TfidfVectorizer(
                    ngram_range=(1, 2),
                    strip_accents="unicode",
                    sublinear_tf=True,
                    min_df=1,
                ),
            ),
            (
                "char",
                TfidfVectorizer(
                    analyzer="char_wb",
                    ngram_range=(2, 5),
                    strip_accents="unicode",
                    sublinear_tf=True,
                    min_df=1,
                ),
            ),
        ],
        transformer_weights={"word": 0.25, "char": 1.0},
    )
    return Pipeline(
        [
            ("features", features),
            (
                "classifier",
                LogisticRegression(
                    C=4.0,
                    class_weight="balanced",
                    max_iter=2000,
                ),
            ),
        ]
    )
