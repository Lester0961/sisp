"""Train a staged candidate; pass --promote only after held-out review."""

import argparse
from pathlib import Path

from app.ml.retrain import promote_candidate, retrain_model


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--training-data", type=Path, help="JSON training file; defaults to the 18K corpus when present")
    parser.add_argument("--promote", action="store_true", help="train directly into the active model directory")
    parser.add_argument("--promote-candidate", type=Path, help="promote a separately evaluated staged candidate")
    args = parser.parse_args()
    if args.promote_candidate:
        promote_candidate(args.promote_candidate)
    else:
        retrain_model(args.training_data, promote=args.promote)
