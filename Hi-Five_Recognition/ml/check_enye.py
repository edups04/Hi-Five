import cv2
import numpy as np
from pathlib import Path
from src.landmarks import HandLandmarkExtractor

extractor = HandLandmarkExtractor(model_path='models/hand_landmarker.task')

enye_dir = Path('data/fsl_alphabet_train') / '\u00d1'
imgs = list(enye_dir.glob('*.jpg'))
print(f'Total images: {len(imgs)}')

for img_path in imgs[:5]:
    img = cv2.imread(str(img_path))
    if img is None:
        print(f'{img_path.name}: FAILED TO LOAD')
        continue
    print(f'{img_path.name}: shape={img.shape}')
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    result = extractor.extract(np.asarray(rgb, dtype=np.uint8))
    print(f'  found={result.found}, normalized={result.normalized is not None}')
