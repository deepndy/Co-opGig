"""Evaluate binary change masks against labelled masks; no scores are bundled.
Usage: python scripts/evaluate.py --prediction predicted.png --ground-truth label.png
White/nonzero pixels are treated as changed. Masks must have equal dimensions.
"""
import argparse
import numpy as np
from PIL import Image

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--prediction", required=True)
    p.add_argument("--ground-truth", required=True)
    args = p.parse_args()
    pred = np.asarray(Image.open(args.prediction).convert("L")) > 0
    truth = np.asarray(Image.open(args.ground_truth).convert("L")) > 0
    if pred.shape != truth.shape:
        raise SystemExit("Prediction and ground-truth masks must have identical dimensions")
    tp = int(np.logical_and(pred, truth).sum())
    fp = int(np.logical_and(pred, ~truth).sum())
    fn = int(np.logical_and(~pred, truth).sum())
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    iou = tp / (tp + fp + fn) if tp + fp + fn else 1.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    print({"IoU": iou, "precision": precision, "recall": recall, "F1": f1, "TP": tp, "FP": fp, "FN": fn})

if __name__ == "__main__":
    main()
