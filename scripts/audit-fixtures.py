# Local audit fixture: binds to loopback only; never connects to Supabase.
# State is held in memory and disappears when this process stops.
import json,re,time
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlparse,parse_qs
raw=Path('supabase/migrations/20260924000001_align_seo_pages_with_public_site.sql').read_text()
expected=json.loads(re.search(r'\$expected\$(.*?)\$expected\$',raw,re.S)[1])
rows=[]
for i,x in enumerate(expected):
 r={k:x[k] for k in ['slug','h1','og_title','og_description']}
 r.update({k:x['new_'+k] or x['old_'+k] for k in ['intro','content','meta_title','meta_description']})
 r.update(id=f'00000000-0000-0000-0000-00000000000{i}',published=True,cta_label='Réserver une séance',image_url=None,image_alt=None,updated_at='2026-09-25T00:00:00Z');rows.append(r)
user={'id':'11111111-1111-1111-1111-111111111111','email':'audit@example.invalid','aud':'authenticated','role':'authenticated','app_metadata':{},'user_metadata':{},'created_at':'2026-09-25T00:00:00Z'}
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def reply(self,data,status=200):
  b=json.dumps(data,ensure_ascii=False).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Access-Control-Allow-Origin','*');self.send_header('Access-Control-Allow-Headers','*');self.send_header('Access-Control-Allow-Methods','GET,POST,PATCH,OPTIONS');self.end_headers();self.wfile.write(b)
 def do_OPTIONS(self):self.reply({})
 def do_GET(self):
  u=urlparse(self.path);q=parse_qs(u.query);mode=Path('/tmp/soleana-mock-mode').read_text().strip() if Path('/tmp/soleana-mock-mode').exists() else ''
  if u.path=='/auth/v1/user':return self.reply(user)
  if u.path.endswith('/user_roles'):return self.reply([{'role':'admin'}])
  if u.path.endswith('/seo_pages'):
   if mode=='error' or q.get('slug')==['eq.audit-error']:return self.reply({'message':'PRIVATE_POSTGREST_DETAIL','code':'PGRST999'},500)
   data=[r for r in rows if (not q.get('slug') or q['slug'][0]=='eq.'+r['slug']) and (not q.get('published') or r['published'])]
   if 'application/vnd.pgrst.object+json' in self.headers.get('Accept',''):return self.reply(data[0] if data else None)
   return self.reply(data)
  if u.path.endswith('/faq'):return self.reply([{'id':'fixture-faq','question':'Question locale de vérification','answer':'Réponse locale SSR avec apostrophe : l’été.','published':True,'display_order':1}])
  if u.path.endswith('/services'):return self.reply([{'id':'fixture-service','name':'Prestation locale de vérification','description':'Description locale SSR','price_eur':123,'features':['Détail local'],'featured':True,'active':True,'display_order':1}])
  return self.reply([])
 def do_POST(self):
  if self.path.startswith('/auth/v1/token'):return self.reply({'access_token':'local-token','refresh_token':'local-refresh','expires_in':3600,'token_type':'bearer','user':user})
  return self.reply({'error':'Writes denied'},405)
 def do_PATCH(self):
  # In-memory fixture only; never connects to Supabase.
  q=parse_qs(urlparse(self.path).query);patch=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
  if Path('/tmp/soleana-mock-mode').read_text().strip()=='save-error':return self.reply({'message':'PRIVATE_WRITE_DETAIL'},500)
  time.sleep(.4)
  for r in rows:
   if q.get('id')==['eq.'+r['id']]:r.update(patch);return self.reply(r)
  return self.reply(None,406)
Path('/tmp/soleana-mock-mode').write_text('')
ThreadingHTTPServer(('127.0.0.1',9239),Handler).serve_forever()
