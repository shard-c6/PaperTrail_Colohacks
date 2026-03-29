import os
import cv2
import numpy as np

def generate():
    seed_dir = os.path.dirname(__file__)
    images_dir = os.path.join(seed_dir, "images")
    hogs_dir = os.path.join(seed_dir, "hogs")
    
    os.makedirs(hogs_dir, exist_ok=True)
    
    if not os.path.exists(images_dir):
        os.makedirs(images_dir, exist_ok=True)
        print(f"Created '{images_dir}'. Please place your template image files here and re-run.")
        print("Note: The filename determines the template_id! (e.g. 'income_certificate_mh_v1.jpg')")
        return
        
    hog_descriptor = cv2.HOGDescriptor(
        _winSize=(64, 64),
        _blockSize=(16, 16),
        _blockStride=(8, 8),
        _cellSize=(8, 8),
        _nbins=9
    )
        
    count = 0
    for f in os.listdir(images_dir):
        if not (f.endswith(".jpg") or f.endswith(".png") or f.endswith(".jpeg")):
            continue
            
        path = os.path.join(images_dir, f)
        img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            print(f"Failed to read {f}.")
            continue
            
        # Resize identically to matching.py
        img = cv2.resize(img, (800, 800))
        features = hog_descriptor.compute(img).flatten()
        
        tid = os.path.splitext(f)[0]
        out_path = os.path.join(hogs_dir, f"{tid}.npy")
        np.save(out_path, features)
        print(f"Saved: {out_path}")
        count += 1
        
    print(f"Done! Extracted {count} HOG feature vectors into seed/hogs/.")

if __name__ == "__main__":
    generate()
