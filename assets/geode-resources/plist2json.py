import plistlib, json, sys, re, math
from PIL import Image

def parse_pair(s):
    # "{a,b}" -> (float(a), float(b))
    nums = re.findall(r'-?[\d.]+', s)
    return float(nums[0]), float(nums[1])

def parse_rect(s):
    # "{{x,y},{w,h}}" -> (x,y,w,h)
    nums = re.findall(r'-?[\d.]+', s)
    return tuple(float(n) for n in nums)

def convert(plist_path, png_path, out_json_path, out_png_path, rotate_dir=-90):
    d = plistlib.load(open(plist_path, 'rb'))
    frames_in = d['frames']
    src = Image.open(png_path).convert('RGBA')

    items = []  # (name, crop_image_upright, sourceSize(w,h), trimmedX, trimmedY, trimmedW, trimmedH)
    for name, fd in frames_in.items():
        clean_name = name.split('/')[-1]
        tx, ty, tw, th = parse_rect(fd['textureRect'])
        rotated = bool(fd.get('textureRotated', False))
        ssw, ssh = parse_pair(fd['spriteSize'])       # logical (unrotated) trimmed size
        sow, soh = parse_pair(fd['spriteSourceSize']) # original untrimmed size
        offx, offy = parse_pair(fd['spriteOffset'])

        if rotated:
            # textureRect w/h are reported in LOGICAL (final) orientation even when rotated;
            # the physical block on the sheet is actually (th, tw) -- swapped -- so crop with
            # swapped dims, then rotate -90 (clockwise) to restore the logical orientation.
            crop = src.crop((int(tx), int(ty), int(tx + th), int(ty + tw)))
            crop = crop.rotate(rotate_dir, expand=True)
        else:
            crop = src.crop((int(tx), int(ty), int(tx + tw), int(ty + th)))
        # after un-rotating, crop.size should equal (ssw, ssh)
        if crop.size != (int(ssw), int(ssh)):
            print(f"WARN size mismatch {clean_name}: crop={crop.size} expected={(ssw, ssh)}")

        trimmedX = (sow - ssw) / 2 + offx
        trimmedY = (soh - ssh) / 2 - offy

        items.append({
            'name': clean_name,
            'img': crop,
            'sourceSize': (int(sow), int(soh)),
            'spriteSourceSize': (round(trimmedX), round(trimmedY), int(ssw), int(ssh)),
        })

    # shelf-pack
    items.sort(key=lambda it: it['img'].size[1], reverse=True)
    max_width = 2048
    pad = 2
    x = pad
    y = pad
    row_h = 0
    positions = []
    for it in items:
        w, h = it['img'].size
        if x + w + pad > max_width:
            x = pad
            y += row_h + pad
            row_h = 0
        positions.append((x, y))
        row_h = max(row_h, h)
        x += w + pad
    total_h = y + row_h + pad
    total_w = max_width

    atlas = Image.new('RGBA', (total_w, total_h), (0, 0, 0, 0))
    frames_out = {}
    for it, (px, py) in zip(items, positions):
        w, h = it['img'].size
        atlas.paste(it['img'], (px, py), it['img'])
        sx, sy, sw, sh = it['spriteSourceSize']
        frames_out[it['name']] = {
            'frame': {'x': px, 'y': py, 'w': w, 'h': h},
            'rotated': False,
            'trimmed': (sw, sh) != it['sourceSize'],
            'spriteSourceSize': {'x': sx, 'y': sy, 'w': w, 'h': h},
            'sourceSize': {'w': it['sourceSize'][0], 'h': it['sourceSize'][1]},
        }

    out = {
        'frames': frames_out,
        'meta': {
            'app': 'plist2json-converter',
            'version': '1.0',
            'image': out_png_path.split('/')[-1],
            'format': 'RGBA8888',
            'size': {'w': total_w, 'h': total_h},
            'scale': 1,
        }
    }

    atlas.save(out_png_path)
    with open(out_json_path, 'w') as f:
        json.dump(out, f, indent=2)
    print(f"wrote {out_json_path} ({len(frames_out)} frames) and {out_png_path} ({total_w}x{total_h})")

if __name__ == '__main__':
    plist_path, png_path, out_json, out_png, rotate_dir = sys.argv[1:6]
    convert(plist_path, png_path, out_json, out_png, int(rotate_dir))
