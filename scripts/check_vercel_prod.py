import urllib.request
import re

URL = 'https://textile-bioreactor-digital-twin.vercel.app'
req = urllib.request.Request(URL, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode('utf-8')
    print('HTML status:', resp.status)
    print('HTML:', html)
    
    js_match = re.search(r'src="(/assets/[^"]+\.js)"', html)
    css_match = re.search(r'href="(/assets/[^"]+\.css)"', html)
    
    if js_match:
        js_url = URL + js_match.group(1)
        with urllib.request.urlopen(urllib.request.Request(js_url, headers={'User-Agent': 'Mozilla/5.0'})) as jresp:
            js_bytes = jresp.read()
            print('JS bundle status:', jresp.status, 'size:', len(js_bytes), 'URL:', js_url)
            # check if component labels or industrial equipment is present in this deployed bundle
            has_labels = b'Equipment Labels' in js_bytes or b'componentFilter' in js_bytes
            print('Has latest equipment labels feature in production bundle:', has_labels)
            
    if css_match:
        css_url = URL + css_match.group(1)
        with urllib.request.urlopen(urllib.request.Request(css_url, headers={'User-Agent': 'Mozilla/5.0'})) as cresp:
            print('CSS bundle status:', cresp.status, 'size:', len(cresp.read()), 'URL:', css_url)
