"""Build a fixed public destination allowlist from the existing HTML records."""
import hashlib
import json
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from lxml import html

ROOT = Path(__file__).resolve().parent.parent
ORIGIN = 'https://www.northumbriaconstruct.com'
bodies = {'ciob.org': 'CIOB', 'apm.org.uk': 'APM', 'ice.org.uk': 'ICE', 'rics.org': 'RICS', 'cabe.org.uk': 'CABE', 'ciat.org.uk': 'CIAT', 'istructe.org': 'IStructE', 'cibse.org': 'CIBSE'}
pages, targets = [], {}
for path in sorted(ROOT.glob('*.html')):
    if path.name == '404.html':
        continue
    pages.append('/' if path.name == 'index.html' else '/' + path.name)
    tree = html.fromstring(path.read_bytes())
    for anchor in tree.xpath('//a[@href]'):
        if anchor.get('href') == '#main':
            continue
        parsed = urlsplit(urljoin(ORIGIN + '/' + path.name, anchor.get('href')))
        host = (parsed.hostname or '').removeprefix('www.')
        category = None
        if parsed.netloc == 'www.northumbriaconstruct.com' and parsed.path in ['/projects.html', '/innovation-lab.html']:
            category = 'project'
        elif parsed.path.lower().endswith(('.pdf', '.doc', '.docx', '.xlsx', '.zip')) or anchor.get('download') is not None:
            category = 'download'
        elif host in bodies and '/events/' in parsed.path:
            category = 'event'
        elif host in bodies:
            category = 'membership'
        if not category:
            continue
        destination = parsed.path + ('#' + parsed.fragment if parsed.fragment else '') if parsed.netloc == 'www.northumbriaconstruct.com' else parsed.geturl()
        label = ' '.join(anchor.text_content().split()).replace('↗', '').strip()
        targets.setdefault(destination, {'id': category + '-' + hashlib.sha256(destination.encode()).hexdigest()[:12], 'category': category, 'label': label, 'destination': destination})
output = {'pages': pages, 'targets': sorted(targets.values(), key=lambda item: (item['category'], item['destination']))}
(ROOT / 'server' / 'analytics-catalog.json').write_bytes((json.dumps(output, indent=2) + '\n').encode('utf-8'))
print(f'{len(pages)} public pages; {len(targets)} approved destinations; no invented download links.')
