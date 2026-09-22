"""Shared scikit-learn pipeline for multilingual short-query intent routing."""

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import FeatureUnion, Pipeline


def build_intent_pipeline() -> Pipeline:
    # Word n-grams capture intent phrases; character n-grams tolerate Filipino
    # inflections, spelling variation, and English/Filipino code-switching.
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
                    ngram_range=(3, 5),
                    strip_accents="unicode",
                    sublinear_tf=True,
                    min_df=1,
                ),
            ),
        ],
        transformer_weights={"word": 1.0, "char": 0.65},
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
