import base64
import io
import json
import os
import sys
import tempfile
from pathlib import Path


def main():
    try:
        os.environ.setdefault("PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT", "0")
        payload = json.loads(sys.stdin.read() or "{}")
        image_base64 = payload.get("imagePngBase64") or ""
        lang = payload.get("langHint") or "ch"
        if not image_base64:
            print_result(False, "", [], "missing imagePngBase64")
            return

        try:
            from paddleocr import PaddleOCR
        except Exception as exc:
            print_result(False, "", [], "PaddleOCR is not installed: " + str(exc))
            return

        image_bytes = base64.b64decode(image_base64)
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as image_file:
            image_file.write(image_bytes)
            image_path = image_file.name

        try:
            blocks = recognize(PaddleOCR, image_path, lang)
            text = "\n".join(block["text"] for block in blocks if block.get("text"))
            print_result(True, text, blocks, None)
        finally:
            try:
                Path(image_path).unlink(missing_ok=True)
            except Exception:
                pass
    except Exception as exc:
        print_result(False, "", [], str(exc))


def recognize(PaddleOCR, image_path, lang):
    try:
        ocr = PaddleOCR(
            lang=lang,
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
        )
        raw_result = ocr.predict(image_path)
        return normalize_v3_result(raw_result)
    except TypeError:
        ocr = PaddleOCR(use_angle_cls=True, lang=lang)
        raw_result = ocr.ocr(image_path, cls=True)
        return normalize_v2_result(raw_result)
    except AttributeError:
        ocr = PaddleOCR(use_angle_cls=True, lang=lang)
        raw_result = ocr.ocr(image_path, cls=True)
        return normalize_v2_result(raw_result)


def normalize_v3_result(raw_result):
    blocks = []
    for res in raw_result or []:
        data = getattr(res, "json", None) or {}
        payload = data.get("res", data)
        texts = payload.get("rec_texts") or []
        scores = payload.get("rec_scores") or []
        boxes = payload.get("rec_polys") or payload.get("dt_polys") or []
        for index, text in enumerate(texts):
            score = scores[index] if index < len(scores) else None
            box = boxes[index] if index < len(boxes) else None
            blocks.append({"text": str(text or ""), "score": to_float(score), "box": to_list(box)})
    return blocks


def normalize_v2_result(raw_result):
    blocks = []
    for page in raw_result or []:
        for item in page or []:
            if not item or len(item) < 2:
                continue
            box = item[0]
            text_score = item[1]
            text = ""
            score = None
            if isinstance(text_score, (list, tuple)) and text_score:
                text = str(text_score[0] or "")
                if len(text_score) > 1:
                    score = to_float(text_score[1])
            blocks.append({"text": text, "score": score, "box": to_list(box)})
    return blocks


def to_float(value):
    try:
        return float(value)
    except Exception:
        return None


def to_list(value):
    if value is None:
        return None
    if hasattr(value, "tolist"):
        return value.tolist()
    if isinstance(value, (list, tuple)):
        return [to_list(item) for item in value]
    try:
        return float(value)
    except Exception:
        return value


def print_result(ok, text, blocks, error):
    print(
        json.dumps(
            {
                "ok": ok,
                "text": text,
                "blocks": blocks,
                "error": error,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
