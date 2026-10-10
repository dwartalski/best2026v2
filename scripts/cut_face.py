"""Wycina tło z portretu i przycina wynik do nieprzezroczystej części.

Użycie: python scripts/cut_face.py portret.jpg public/faces/napoleon.png
Wymaga: pip install rembg pillow. Portret najlepiej wcześniej przyciąć do samej głowy.
"""
import sys

from PIL import Image
from rembg import remove

source, target = sys.argv[1], sys.argv[2]
cutout = remove(Image.open(source).convert("RGBA"))
cutout = cutout.crop(cutout.getbbox())
cutout.thumbnail((1024, 1024))
cutout.save(target)
print(f"Zapisano {target} ({cutout.width}x{cutout.height})")
