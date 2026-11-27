"""Website text from the Google Sheet, written into the pages.

Two tabs:
  "Website copy"        Section | What it is | Text | Key      one row per piece of text (Key: don't change it)
  "Privacy and terms"   Page | Type | Text                     the two legal pages, one row per heading/paragraph

How it reaches the pages: every piece of text in the HTML carries data-copy="key". This script replaces the text of
each one with the sheet's text, so the pages stay plain HTML (fast, readable by Google) with no loading from the sheet.
A key with an empty Text cell keeps what the page already says.

Special keys:
  email, phone, instagram_handle, instagram_link   also update links (mailto:, tel:, the Instagram address) and,
                                                    for phone, KT_PHONE in js/config.js
  title_*  the browser tab title;  meta_*  the description Google shows (data-copy-attr="content:key")

Privacy and terms, Type column: Title, Updated, Heading, Paragraph, Bullet, Detail ("Label | value").
In Text: [words](address) makes a link; [anything else in square brackets] is highlighted as still to fill in;
email addresses and +44 phone numbers become links by themselves; [words](#cookie-settings) reopens the cookie question.
{email} and {phone} (in either tab) are replaced with the Contact details rows, so they only need changing once.
"""
import html, os, re

PAGES = ['index', 'projects', 'about', 'contact', 'privacy', 'terms']

# Key, section, what it is. The order is the order of rows in the sheet.
ROWS = [
    ('email', 'Contact details', 'Email address (header, menu, contact page, legal pages)'),
    ('phone', 'Contact details', 'Phone number, as people should see it'),
    ('instagram_handle', 'Contact details', 'Instagram name shown in the menu and contact page'),
    ('instagram_link', 'Contact details', 'Instagram address the name links to'),
    ('nav_projects', 'Every page', 'Menu: Projects'),
    ('nav_about', 'Every page', 'Menu: About'),
    ('nav_contact', 'Every page', 'Menu: Contact'),
    ('coords_place', 'Every page', 'Top right: place'),
    ('coords', 'Every page', 'Top right: coordinates'),
    ('cta_visit', 'Every page', 'Visit button (footer, project view, projects and about pages)'),
    ('footer_privacy', 'Every page', 'Footer link: Privacy'),
    ('footer_terms', 'Every page', 'Footer link: Terms'),
    ('cookie_question', 'Cookie question', 'The question'),
    ('cookie_more', 'Cookie question', 'Link to the cookie section of the privacy page'),
    ('cookie_yes', 'Cookie question', 'Yes button'),
    ('cookie_no', 'Cookie question', 'No button'),
    ('title_home', 'Home', 'Browser tab title'),
    ('meta_home', 'Home', 'Description Google shows in search results'),
    ('home_hidden_heading', 'Home', 'Main heading (hidden on screen, read by Google and screen readers)'),
    ('home_intro', 'Home', 'Intro text'),
    ('home_intro_link', 'Home', 'Link under the intro'),
    ('title_projects', 'Projects', 'Browser tab title'),
    ('meta_projects', 'Projects', 'Description Google shows in search results'),
    ('projects_title', 'Projects', 'Big title'),
    ('projects_empty', 'Projects', 'Shown when a filter has no projects'),
    ('crumb_home', 'Project view', 'Breadcrumb: Home'),
    ('crumb_projects', 'Project view', 'Breadcrumb: Projects'),
    ('project_back', 'Project view', 'Back button'),
    ('project_next', 'Project view', 'Next button'),
    ('project_label_type', 'Project view', 'Label: Type'),
    ('project_label_location', 'Project view', 'Label: Location'),
    ('project_label_year', 'Project view', 'Label: Year'),
    ('title_about', 'About', 'Browser tab title'),
    ('meta_about', 'About', 'Description Google shows in search results'),
    ('about_title_1', 'About', 'Big title, line 1'),
    ('about_title_2', 'About', 'Big title, line 2'),
    ('title_contact', 'Contact', 'Browser tab title'),
    ('meta_contact', 'Contact', 'Description Google shows in search results'),
    ('contact_title_1', 'Contact', 'Big title, line 1'),
    ('contact_title_2', 'Contact', 'Big title, line 2'),
    ('form_title', 'Contact form', 'Form title'),
    ('form_intro', 'Contact form', 'Text under the form title'),
    ('form_name', 'Contact form', 'Name question'),
    ('form_email', 'Contact form', 'Email question'),
    ('form_phone', 'Contact form', 'Phone question'),
    ('form_optional', 'Contact form', 'Small "optional" next to phone'),
    ('form_where', 'Contact form', 'Where question'),
    ('form_job', 'Contact form', 'Kind of job question'),
    ('form_job_1', 'Contact form', 'Job choice 1'),
    ('form_job_2', 'Contact form', 'Job choice 2'),
    ('form_job_3', 'Contact form', 'Job choice 3'),
    ('form_job_4', 'Contact form', 'Job choice 4'),
    ('form_job_5', 'Contact form', 'Job choice 5'),
    ('form_when', 'Contact form', 'Visit question'),
    ('form_when_email', 'Contact form', 'Visit choice: no visit'),
    ('form_when_this_week', 'Contact form', 'Visit choice: this week'),
    ('form_when_next_week', 'Contact form', 'Visit choice: next week'),
    ('form_when_any', 'Contact form', 'Visit choice: any day'),
    ('form_message', 'Contact form', 'Message question'),
    ('form_photos', 'Contact form', 'Photos label'),
    ('form_photos_optional', 'Contact form', 'Small text next to Photos'),
    ('form_add_photo', 'Contact form', 'Add photo button'),
    ('form_send', 'Contact form', 'Send button'),
    ('msg_sending', 'Contact form messages', 'While sending'),
    ('msg_thanks', 'Contact form messages', 'Thank-you title (their first name is added after it)'),
    ('msg_thanks_visit', 'Contact form messages', 'Thank-you text when they asked for a visit'),
    ('msg_thanks_email', 'Contact form messages', 'Thank-you text when they just emailed'),
    ('msg_error', 'Contact form messages', "When it didn't send"),
    ('msg_need_name', 'Contact form messages', 'Name missing'),
    ('msg_need_email', 'Contact form messages', 'Email missing or wrong'),
    ('msg_need_message', 'Contact form messages', 'Message missing'),
    ('msg_photos_too_large', 'Contact form messages', 'Photos too large'),
    ('msg_preparing_photo', 'Contact form messages', 'While a photo is being added'),
    ('msg_pick_day', 'Contact form messages', 'After choosing "This week"'),
    ('title_privacy', 'Privacy and terms', 'Privacy: browser tab title (page text is on the Privacy and terms tab)'),
    ('meta_privacy', 'Privacy and terms', 'Privacy: description Google shows'),
    ('title_terms', 'Privacy and terms', 'Terms: browser tab title'),
    ('meta_terms', 'Privacy and terms', 'Terms: description Google shows'),
]

esc = lambda s: html.escape(s, quote=False)
attr = lambda s: html.escape(s, quote=True)


def read(root, name):
    return open(os.path.join(root, name), encoding='utf-8').read()


def write(root, name, text):
    path = os.path.join(root, name)
    if read(root, name) != text:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(text)
        return True
    return False


# ---------- reading what the pages say now (to fill the sheet the first time) ----------
def current(root):
    found = {}
    for p in PAGES:
        s = read(root, p + '.html')
        for m in re.finditer(r'<(\w+)[^>]*\bdata-copy="(\w+)"[^>]*>(.*?)</\1>', s, re.S):
            found.setdefault(m.group(2), html.unescape(m.group(3)).strip())
        for m in re.finditer(r'data-copy-attr="content:(\w+)" content="([^"]*)"', s):
            found.setdefault(m.group(1), html.unescape(m.group(2)))
    m = re.search(r'href="(https://(?:www\.)?instagram\.com/[^"]*)" data-contact="instagram"', read(root, 'index.html'))
    found['instagram_link'] = m.group(1) if m else 'https://instagram.com/'
    return found


def legal_rows(root):
    """The privacy and terms pages as sheet rows."""
    rows = []
    def inline(h):
        h = re.sub(r'<span class="todo">(.*?)</span>', r'\1', h)
        h = re.sub(r'<a [^>]*data-cookie-settings[^>]*>(.*?)</a>', r'[\1](#cookie-settings)', h)
        def link(m):
            href, text = m.group(1), re.sub('<[^>]+>', '', m.group(2))
            if href.startswith('mailto:') and href[7:] == text: return text
            if href.startswith('tel:'): return text
            return f'[{text}]({href})'
        h = re.sub(r'<a [^>]*href="([^"]*)"[^>]*>(.*?)</a>', link, h)
        return html.unescape(re.sub(r'<[^>]+>', '', h)).strip()
    for page in ('privacy', 'terms'):
        s = read(root, page + '.html')
        body = re.search(r'<article class="legal" data-legal="%s">(.*?)</article>' % page, s, re.S).group(1)
        for m in re.finditer(r'<h1>(.*?)</h1>|<p class="updated">(.*?)</p>|<h2[^>]*>(.*?)</h2>|<li>(.*?)</li>|<dt>(.*?)</dt><dd>(.*?)</dd>|<p>(.*?)</p>', body, re.S):
            h1, upd, h2, li, dt, dd, p = m.groups()
            if h1: rows.append([page.title(), 'Title', inline(h1)])
            elif upd: rows.append([page.title(), 'Updated', inline(upd)])
            elif h2: rows.append([page.title(), 'Heading', inline(h2)])
            elif li: rows.append([page.title(), 'Bullet', inline(li)])
            elif dt: rows.append([page.title(), 'Detail', inline(dt) + ' | ' + inline(dd)])
            elif p: rows.append([page.title(), 'Paragraph', inline(p)])
    return rows


# ---------- writing the sheet's text into the pages ----------
def inline_html(text):
    out, i = [], 0
    pat = re.compile(r'\[([^\]]+)\]\(([^)\s]+)\)|\[([^\]]+)\]|([\w.+-]+@[\w-]+(?:\.[\w-]+)+)|(\+44[\d ]{9,14}\d)')
    for m in pat.finditer(text):
        out.append(esc(text[i:m.start()])); i = m.end()
        label, href, todo, mail, tel = m.groups()
        if label is not None:
            if href == '#cookie-settings':
                out.append(f'<a class="text-cta" href="#cookies" data-cookie-settings>{esc(label)}</a>')
            else:
                ext = href.startswith('http')
                out.append(f'<a href="{attr(href)}"{" target=\"_blank\" rel=\"noopener\"" if ext else ""}>{esc(label)}</a>')
        elif todo is not None:
            out.append(f'<span class="todo">[{esc(todo)}]</span>')
        elif mail:
            out.append(f'<a href="mailto:{attr(mail)}" target="_blank" rel="noopener">{esc(mail)}</a>')
        else:
            out.append(f'<a href="tel:{re.sub(r"[^0-9+]", "", tel)}">{esc(tel)}</a>')
    out.append(esc(text[i:]))
    return ''.join(out)


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def legal_html(rows):
    out, open_list = [], None
    def close():
        nonlocal open_list
        if open_list: out.append(f'</{open_list}>'); open_list = None
    for kind, text in rows:
        kind = kind.strip().lower()
        if not text.strip(): continue
        want = 'ul' if kind == 'bullet' else 'dl' if kind == 'detail' else None
        if want != open_list:
            close()
            if want: out.append(f'<{want}>'); open_list = want
        if kind == 'title': out.append(f'<h1>{esc(text)}</h1>')
        elif kind == 'updated': out.append(f'<p class="updated">{esc(text)}</p>')
        elif kind == 'heading': out.append(f'<h2 id="{slug(text)}">{esc(text)}</h2>')
        elif kind == 'bullet': out.append(f'<li>{inline_html(text)}</li>')
        elif kind == 'detail':
            label, _, value = text.partition('|')
            out.append(f'<dt>{esc(label.strip())}</dt><dd>{inline_html(value.strip())}</dd>')
        else: out.append(f'<p>{inline_html(text)}</p>')
    close()
    return '\n' + '\n'.join(out) + '\n'


def apply(root, copy, legal=None):
    """copy: {key: text}; legal: {'privacy': [(type, text)], 'terms': [...]}. Returns the files that changed."""
    copy = {k: v.strip() for k, v in copy.items() if v and v.strip()}
    old = current(root)
    # a new email or phone number also replaces the old one wherever it's written in other text
    swaps = [(old[k], copy[k]) for k in ('email', 'phone') if k in copy and old.get(k) and old[k] != copy[k]]
    def swap(t):
        for a, b in swaps: t = t.replace(a, b)
        return t
    email, phone = copy.get('email') or old.get('email', ''), copy.get('phone') or old.get('phone', '')
    fill = lambda t: swap(t).replace('{email}', email).replace('{phone}', phone)
    copy = {k: fill(v) for k, v in copy.items()}
    if legal:
        legal = {pg: [(kind, fill(text)) for kind, text in rows] for pg, rows in legal.items()}
    changed = []
    for p in PAGES:
        name = p + '.html'
        s = read(root, name)
        def put(m):
            key = m.group(2)
            return m.group(0) if key not in copy else m.group(1) + esc(copy[key]) + m.group(4)
        s = re.sub(r'(<(\w+)[^>]*\bdata-copy="(\w+)"[^>]*>).*?(</\2>)', lambda m: (m.group(1) + esc(copy[m.group(3)]) + m.group(4)) if m.group(3) in copy else m.group(0), s, flags=re.S)
        s = re.sub(r'(data-copy-attr="content:(\w+)" content=")[^"]*(")', lambda m: (m.group(1) + attr(copy[m.group(2)]) + m.group(3)) if m.group(2) in copy else m.group(0), s)
        if 'email' in copy and old.get('email') and copy['email'] != old['email']:
            s = s.replace('mailto:' + old['email'], 'mailto:' + copy['email']).replace(esc(old['email']), esc(copy['email']))
        if 'phone' in copy:
            tel = re.sub(r'[^0-9+]', '', copy['phone'])
            s = re.sub(r'href="tel:[^"]*"', f'href="tel:{tel}"', s)
        if 'instagram_link' in copy:
            s = re.sub(r'href="[^"]*"( data-contact="instagram")', lambda m: f'href="{attr(copy["instagram_link"])}"' + m.group(1), s)
        if legal and p in legal and legal[p]:
            s = re.sub(r'(<article class="legal" data-legal="%s">).*?(</article>)' % p, lambda m: m.group(1) + legal_html(legal[p]) + m.group(2), s, flags=re.S)
        if write(root, name, s): changed.append(name)
    cfg = read(root, 'js/config.js')
    if 'phone' in copy:
        cfg = re.sub(r'window\.KT_PHONE = "[^"]*";', 'window.KT_PHONE = "%s";' % copy['phone'].replace('"', ''), cfg)
    if 'email' in copy and old.get('email'):
        for js in ('js/enquiry.js',):
            t = read(root, js)
            if write(root, js, t.replace(old['email'], copy['email'])): changed.append(js)
    if write(root, 'js/config.js', cfg): changed.append('js/config.js')
    return changed
