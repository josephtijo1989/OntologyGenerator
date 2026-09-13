from PIL import Image

def remove_background(image_path, output_path, threshold=220):
    img = Image.open(image_path).convert("RGBA")
    datas = img.getdata()

    new_data = []
    for item in datas:
        r, g, b, a = item
        # Check if the pixel is near-white / light background
        if r > threshold and g > threshold and b > threshold:
            new_data.append((255, 255, 255, 0))  # Transparent
        else:
            new_data.append(item)

    img.putdata(new_data)
    img.save(output_path, "PNG")
    print(f"Background successfully removed and saved to: {output_path}")

if __name__ == "__main__":
    img_path = r"c:\Users\TIJO\Documents\antigravity\quick-pasteur\backend\app\static\img\ontoforge_logo.png"
    remove_background(img_path, img_path, threshold=210)
