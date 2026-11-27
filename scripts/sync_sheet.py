#!/usr/bin/env python3
"""Daily copy of the Google Sheet into the website.

Reads the "Projects" and "About page" tabs of the sheet set in js/config.js, downloads every project photo
from Google Drive into img/sheet/, and writes:
  data/projects.json   the projects the site shows (photos point at img/sheet/…)
  data/about.json      the About page text
The website only reads these files, so it keeps working even if Google or the sheet has a problem.

Safety: if the sheet can't be read, isn't shared, or has no visible projects, nothing is changed and the script
exits with an error (GitHub then emails the repo owner). Photos that fail to download keep their previous copy.

It also writes the "Website copy" and "Privacy and terms" tabs into the pages (scripts/site_copy.py).

Run by .github/workflows/sync-sheet.yml every evening at 6pm UK time, or by hand: python3 scripts/sync_sheet.py
"""
import csv, io, json, os, re, sys, unicodedata, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(ROOT, 'img', 'sheet')
FULL, THUMB = 1800, 700          # longest side in pixels for the big photo and for the grid/thumbnail copy


def sheet_id():
    cfg = open(os.path.join(ROOT, 'js', 'config.js'), encoding='utf-8').read()
    m = re.search(r'/spreadsheets/d/([a-zA-Z0-9-_]+)', cfg)
    if not m:
        sys.exit('No Google Sheet link found in js/config.js')
    return m.group(1)


def fetch(url, timeout=60):
    req = urllib.request.Request(url, headers={'User-Agent': 'victorian-tiler-sync'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def tab_rows(sid, tab=None):
    url = f'https://docs.google.com/spreadsheets/d/{sid}/gviz/tq?tqx=out:csv&headers=1'
    if tab:
        url += '&sheet=' + urllib.request.quote(tab)
    text = fetch(url).decode('utf-8')
    if text.lstrip().startswith('<'):
        raise RuntimeError('the sheet is not shared as "Anyone with the link: Viewer"')
    rows = [r for r in csv.reader(io.StringIO(text)) if any(c.strip() for c in r)]
    if not rows:
        raise RuntimeError(f'tab {tab or "Projects"} is empty')
    head = [re.sub(r'[^a-z0-9]', '', h.lower()) for h in rows[0]]
    return head, rows[1:]


def slug(s):
    s = unicodedata.normalize('NFKD', s.lower())
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def drive_id(u):
    m = re.search(r'drive\.google\.com/(?:file/d/|open\?id=|uc\?(?:export=\w+&)?id=|thumbnail\?(?:[^#]*&)?id=)([a-zA-Z0-9-_]+)', u or '')
    return m.group(1) if m else None


def save_photo(u):
    """Copy one photo from Drive to img/sheet/<id>.jpg (+ -t.jpg thumbnail). Returns (full, thumb) site paths."""
    fid = drive_id(u)
    if not fid:
        return (u, u) if u else ('', '')                      # not a Drive link: use as it is
    full, thumb = f'img/sheet/{fid}.jpg', f'img/sheet/{fid}-t.jpg'
    pf, pt = os.path.join(ROOT, full), os.path.join(ROOT, thumb)
    if not (os.path.exists(pf) and os.path.exists(pt)):       # Drive files don't change under the same id
        from PIL import Image, ImageOps
        try:
            data = fetch(f'https://lh3.googleusercontent.com/d/{fid}=w2400')
            im = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert('RGB')
            for path, side in ((pf, FULL), (pt, THUMB)):
                c = im.copy(); c.thumbnail((side, side), Image.LANCZOS)
                c.save(path, 'JPEG', quality=82, optimize=True, progressive=True)
        except Exception as e:
            print(f'  ! could not copy photo {fid}: {e}')
            if not os.path.exists(pf):
                return (f'https://lh3.googleusercontent.com/d/{fid}=w2000', f'https://lh3.googleusercontent.com/d/{fid}=w900')
    return (full, thumb)


def projects(sid):
    head, rows = tab_rows(sid)
    col = lambda *names: next((head.index(n) for n in names if n in head), None)
    def get(r, *names):
        for n in names:
            i = col(n)
            if i is not None and i < len(r) and r[i].strip():
                return r[i].strip()
        return ''
    out, seen = [], {}
    for i, r in enumerate(rows):
        title = get(r, 'title', 'project', 'name')
        after = get(r, 'afterphoto', 'after', 'afterimage', 'photo', 'photo1')
        if not title or not after or re.fullmatch(r'(no|n|false|hide|hidden|0)', get(r, 'show', 'visible', 'live').lower()):
            continue
        before = get(r, 'beforephoto', 'before', 'beforeimage')
        used = {drive_id(u) or u for u in (before, after) if u}
        extra = [u for u in (get(r, n) for n in ('photo2', 'photo3', 'photo4', 'photo5', 'photo6')) if u and (drive_id(u) or u) not in used]
        pid = slug(title) or f'project-{i + 1}'
        if pid in seen:
            seen[pid] += 1; pid += f'-{seen[pid]}'
        else:
            seen[pid] = 1
        try: order = float(get(r, 'order'))
        except ValueError: order = 1000 + i
        a, at = save_photo(after)
        b, bt = save_photo(before) if before else ('', '')
        ex = [save_photo(u) for u in extra]
        out.append({'id': pid, 'order': order, 'title': title, 'year': get(r, 'year'), 'location': get(r, 'location', 'area'),
                    'type': get(r, 'type', 'category'), 'description': get(r, 'description', 'text', 'about'),
                    'after': a, 'afterThumb': at, 'before': b, 'beforeThumb': bt,
                    'photos': [e[0] for e in ex], 'photoThumbs': [e[1] for e in ex]})
    out.sort(key=lambda p: p['order'])
    return out


def about(sid):
    head, rows = tab_rows(sid, 'About page')
    if not head or head[0] != 'section':
        raise RuntimeError('the "About page" tab is missing or its first column is not "Section"')
    return [{h: (r[i].strip() if i < len(r) else '') for i, h in enumerate(head) if h} for r in rows]


def site_text(sid):
    """The "Website copy" and "Privacy and terms" tabs, written into the pages (see scripts/site_copy.py)."""
    sys.path.insert(0, os.path.join(ROOT, 'scripts'))
    import site_copy
    head, rows = tab_rows(sid, 'Website copy')
    k = next((i for i, h in enumerate(head) if h.startswith('key')), None)
    if k is None or 'text' not in head:
        raise RuntimeError('the "Website copy" tab needs Key and Text columns')
    t = head.index('text')
    copy = {r[k].strip(): (r[t] if t < len(r) else '') for r in rows if k < len(r) and r[k].strip()}
    legal = None
    try:
        lh, lrows = tab_rows(sid, 'Privacy and terms')
        pi, ti, xi = lh.index('page'), lh.index('type'), lh.index('text')
        legal = {}
        for r in lrows:
            if len(r) > xi and r[pi].strip():
                legal.setdefault(r[pi].strip().lower(), []).append((r[ti], r[xi]))
    except Exception as e:
        print(f'Privacy and terms not updated: {e}')
    return site_copy.apply(ROOT, copy, legal)


def write_json(name, data):
    path = os.path.join(ROOT, 'data', name)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write('\n')


def main():
    sid = sheet_id()
    os.makedirs(IMG_DIR, exist_ok=True)
    try:
        plist = projects(sid)
    except Exception as e:
        sys.exit(f'Projects not updated: {e}')
    if not plist:
        sys.exit('Projects not updated: no rows with Show = Yes, a title and an after photo')
    write_json('projects.json', plist)
    print(f'{len(plist)} projects')
    try:
        write_json('about.json', about(sid))
        print('About page text updated')
    except Exception as e:
        print(f'About page not updated: {e}')
    try:
        changed = site_text(sid)
        print('Website copy updated:', ', '.join(changed) if changed else 'no changes')
    except Exception as e:
        print(f'Website copy not updated: {e}')
    # tidy photos no project uses any more
    keep = {os.path.basename(u) for p in plist for u in [p['after'], p['afterThumb'], p['before'], p['beforeThumb'], *p['photos'], *p['photoThumbs']] if u.startswith('img/sheet/')}
    for f in os.listdir(IMG_DIR):
        if f not in keep:
            os.remove(os.path.join(IMG_DIR, f))


if __name__ == '__main__':
    main()
