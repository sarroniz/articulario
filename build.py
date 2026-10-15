#!/usr/bin/env python3
"""Genera las dos versiones de la app a partir de plantilla.html y src/*.js.

  index.html               -> three.js desde vendor/ (funciona sin internet; ábrela con un servidor local)
  articulario-online.html  -> three.js desde la CDN jsDelivr (un solo archivo; doble clic, necesita internet)

Uso:  python3 build.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CDN = "https://cdn.jsdelivr.net/npm/three@0.170.0/"
LOCAL = "./vendor/three/"
HEAD = (
    '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    "<style>:root{color-scheme:light}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n"
)


def build(three_base: str) -> str:
    js = "\n".join(p.read_text(encoding="utf-8") for p in sorted((ROOT / "src").glob("*.js")))
    page = (ROOT / "plantilla.html").read_text(encoding="utf-8").replace("/*__APP__*/", js)
    page = page.replace(CDN, three_base)
    cut = page.index("</style>") + len("</style>")  # título, fuentes y CSS van al <head>
    return HEAD + page[:cut] + "\n</head>\n<body>\n" + page[cut:] + "\n</body>\n</html>\n"


if __name__ == "__main__":
    (ROOT / "index.html").write_text(build(LOCAL), encoding="utf-8")
    (ROOT / "articulario-online.html").write_text(build(CDN), encoding="utf-8")
    print("Generados: index.html y articulario-online.html")
