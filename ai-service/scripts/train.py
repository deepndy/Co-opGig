"""Train (or re-train) the baseline classifier and save it.

    python scripts/train.py                       # train on the sample CSV and save
    python scripts/train.py --holdout 0.2         # also report a quick hold-out check first

The saved file (app/models/classifier.joblib) is optional: if it is missing the
service trains the same model in memory at start-up. Do not commit the file.

NOTE: the bundled CSV is a tiny, synthetic, hand-written developer sample. A
hold-out score on it is only a smoke test. It says nothing about real-world
accuracy. Replace it with real, anonymised, labelled job descriptions.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import Settings  # noqa: E402
from app.services.classifier import Classifier, load_training_data  # noqa: E402


def main() -> int:
    settings = Settings.from_env()
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data", type=Path, default=settings.training_data_path, help="CSV with text,category columns")
    parser.add_argument("--out", type=Path, default=settings.model_path, help="where to save the model")
    parser.add_argument("--holdout", type=float, default=0.0, help="fraction (0-0.5) to hold out for a quick check")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    texts, labels = load_training_data(args.data)
    if not texts:
        print(f"No usable rows found in {args.data}", file=sys.stderr)
        return 1
    print(f"Loaded {len(texts)} labelled examples from {args.data}")

    if 0 < args.holdout <= 0.5:
        from sklearn.model_selection import train_test_split

        x_train, x_test, y_train, y_test = train_test_split(
            texts, labels, test_size=args.holdout, random_state=args.seed, stratify=labels
        )
        probe = Classifier(settings).fit(x_train, y_train)
        correct = sum(
            1 for text, label in zip(x_test, y_test) if probe.classify(text).category == label
        )
        print(
            f"Hold-out smoke test: {correct}/{len(x_test)} correct. "
            "(Tiny synthetic data: NOT a real accuracy estimate.)"
        )

    model = Classifier(settings).fit(texts, labels)
    model.save(args.out)
    print(f"Saved model to {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
