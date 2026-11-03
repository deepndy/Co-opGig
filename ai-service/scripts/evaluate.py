"""Evaluate the classifier on a labelled CSV (columns: text,category).

    python scripts/evaluate.py --data app/data/sample_eval_demo.csv
    python scripts/evaluate.py --data my_heldout_test_set.csv --json-out report.json

Prints accuracy, per-category precision / recall / F1, macro averages and a
confusion matrix. It also reports how often the service would have asked a
clarifying question and the accuracy on the answers it was confident about.

HONESTY RULES
  * Only evaluate on data the model was NOT trained on. The script refuses to
    run on the training CSV unless you pass --allow-train-data (then the
    numbers are labelled as invalid).
  * The bundled sample_eval_demo.csv is a tiny, hand-written DEMO for checking
    that this script works. It is NOT a benchmark. Do not quote its numbers as
    the accuracy of the service.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.categories import CATEGORIES  # noqa: E402
from app.config import Settings  # noqa: E402
from app.services.classifier import Classifier, load_training_data  # noqa: E402

UNKNOWN_LABEL = "(unknown)"


def main() -> int:
    settings = Settings.from_env()
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data", type=Path, required=True, help="held-out CSV with text,category columns")
    parser.add_argument("--json-out", type=Path, default=None, help="optional path to save the metrics as JSON")
    parser.add_argument("--allow-train-data", action="store_true", help="evaluate on the training file anyway (numbers invalid)")
    args = parser.parse_args()

    train_path = settings.training_data_path.resolve()
    on_train_data = args.data.resolve() == train_path
    if on_train_data and not args.allow_train_data:
        print(
            "Refusing to evaluate on the training data: the score would be meaningless.\n"
            "Use a separate held-out file, or pass --allow-train-data to see the (invalid) numbers.",
            file=sys.stderr,
        )
        return 2

    from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support

    texts, labels = load_training_data(args.data)
    if not texts:
        print(f"No usable rows found in {args.data}", file=sys.stderr)
        return 1

    classifier = Classifier.load_or_train(settings)
    predictions, asked, confident_total, confident_correct = [], 0, 0, 0
    for text, label in zip(texts, labels):
        result = classifier.classify(text)
        predicted = result.category or UNKNOWN_LABEL
        predictions.append(predicted)
        if result.needs_clarification:
            asked += 1
        else:
            confident_total += 1
            confident_correct += int(predicted == label)

    accuracy = accuracy_score(labels, predictions)
    present = [c for c in CATEGORIES if c in set(labels)]
    precision, recall, f1, support = precision_recall_fscore_support(
        labels, predictions, labels=present, zero_division=0
    )
    macro = precision_recall_fscore_support(labels, predictions, labels=present, average="macro", zero_division=0)
    matrix_labels = present + ([UNKNOWN_LABEL] if UNKNOWN_LABEL in predictions else [])
    matrix = confusion_matrix(labels, predictions, labels=matrix_labels)

    print(f"Data file: {args.data}   examples: {len(texts)}")
    if on_train_data:
        print("*** WARNING: this is the TRAINING data. These numbers are INVALID as accuracy. ***")
    print(f"Accuracy (top suggestion): {accuracy:.3f}")
    print(f"Asked a clarifying question: {asked}/{len(texts)} ({asked / len(texts):.0%})")
    if confident_total:
        print(f"Accuracy when it did NOT ask: {confident_correct}/{confident_total} ({confident_correct / confident_total:.0%})")
    print(f"\n{'category':18} {'precision':>9} {'recall':>7} {'f1':>6} {'support':>8}")
    for name, p, r, f, s in zip(present, precision, recall, f1, support):
        print(f"{name:18} {p:9.2f} {r:7.2f} {f:6.2f} {int(s):8d}")
    print(f"{'macro average':18} {macro[0]:9.2f} {macro[1]:7.2f} {macro[2]:6.2f}")

    print("\nConfusion matrix (rows = true category, columns = predicted category):")
    print("    " + "  ".join(f"{i:>2}" for i in range(len(matrix_labels))))
    for i, row in enumerate(matrix):
        print(f"{i:>2}  " + "  ".join(f"{int(v):>2}" for v in row) + f"   {matrix_labels[i]}")
    print("(column numbers match the row numbers above)")

    if args.json_out:
        report = {
            "dataFile": str(args.data),
            "examples": len(texts),
            "trainingDataWarning": on_train_data,
            "accuracy": accuracy,
            "askedClarification": asked,
            "perCategory": {
                name: {"precision": float(p), "recall": float(r), "f1": float(f), "support": int(s)}
                for name, p, r, f, s in zip(present, precision, recall, f1, support)
            },
            "macroAverage": {"precision": float(macro[0]), "recall": float(macro[1]), "f1": float(macro[2])},
            "confusionMatrix": {"labels": matrix_labels, "matrix": matrix.tolist()},
        }
        args.json_out.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"\nSaved JSON report to {args.json_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
