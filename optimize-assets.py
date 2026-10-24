from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json
import shutil
from PIL import Image

root = Path(__file__).parent / 'dist' / 'assets'
sources = [p for p in root.rglob('*') if p.is_file() and 'fast' not in p.relative_to(root).parts]

def optimize(source):
    relative = source.relative_to(root)
    target = root / 'fast' / relative.with_suffix('.webp')
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        dimensions = image.size
        image.save(target, 'WEBP', quality=94 if source.suffix == '.png' else (88 if 'props' in relative.parts else 82), method=6, alpha_quality=100)
    if source.suffix == '.webp' and target.stat().st_size >= source.stat().st_size:
        shutil.copyfile(source, target)
    with Image.open(target) as image:
        assert image.size == dimensions
    return source.stat().st_size, target.stat().st_size

if __name__ == '__main__':
    sizes = list(ThreadPoolExecutor(max_workers=4).map(optimize, sources))
    print(json.dumps({'files': len(sizes), 'originalBytes': sum(a for a, b in sizes), 'fastBytes': sum(b for a, b in sizes), 'allPixelDimensionsPreserved': True}))
