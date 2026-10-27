"""Local-file UI transport with simulated storage; see docs/VERIFICATION.md."""
from pathlib import Path
from urllib.parse import urlparse
import os
import shutil
import mimetypes

ROOT=Path(__file__).resolve().parents[1]
ORIGIN='http://oddwords.test'
STORAGE_JS='''(saved) => {
 const store = new Map(Object.entries(saved || {}));
 const storage = { getItem: key => store.get(String(key)) ?? null,
   setItem: (key, value) => store.set(String(key), String(value)),
   removeItem: key => store.delete(String(key)), clear: () => store.clear(),
   key: index => [...store.keys()][index] ?? null,
   get length() { return store.size; } };
 Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
}'''

def mount(context, page, filename='index.html', saved=None, root=ROOT):
    requests=[]
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.on('request',lambda r: requests.append(r.url))
    def route(r):
        path=urlparse(r.request.url).path.lstrip('/') or 'index.html'
        file=(root/path).resolve()
        if file.is_file() and file.is_relative_to(root.resolve()):
            content_type='text/javascript' if file.suffix=='.js' else mimetypes.guess_type(file.name)[0] or 'text/plain'
            r.fulfill(body=file.read_bytes(), content_type=content_type, headers={'Access-Control-Allow-Origin':'*'})
        else:r.fulfill(status=404)
    page.route(ORIGIN+'/**', route)
    page.evaluate(STORAGE_JS,saved or {})
    html=(root/filename).read_text().replace('<head>','<head><base href="'+ORIGIN+'/">')
    page.set_content(html,wait_until='networkidle')
    if filename=='index.html':page.wait_for_selector('#play-layout:not([hidden])')
    return requests,errors


def launch_options():
    binary = os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium') or shutil.which('chromium-browser')
    options = {'headless': True}
    if binary:
        options['executable_path'] = binary
    return options
