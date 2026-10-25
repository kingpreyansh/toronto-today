#!/usr/bin/env python3
"""Atomically publish allowlisted public city briefing fields. Never serve source files."""
import argparse
import fcntl
import json
import os
import re
import tempfile
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

ROOT=Path(__file__).resolve().parent
META=('date_iso','date_display','city','timezone','edition','generated_at','content_note')
WEATHER=('temperature','condition','summary','high_low','precipitation','wind','sun','source_url')
EVENT=('title','category','time','venue','neighborhood','location_label','price','status','summary','url','crowd')
SECTIONS={'networking':EVENT,'local_events':EVENT,'cultural_events':EVENT,'social_options':EVENT,
 'business_news':('title','why_it_matters','summary','source','url','impact'),
 'learning':('title','topic','level','read','why','source','url'),
 'best_bets':('category','title','time','location','why','url'),
 'venue_checks':('venue','status','state')}
# Sections that may be absent from a payload and simply default to empty.
OPTIONAL={'learning'}

def safe_url(raw):
 try:
  u=urlparse(raw)
  return u.scheme in ('http','https') and bool(u.hostname) and not u.username and not u.password and not any(ord(c)<32 for c in raw)
 except (ValueError,TypeError):return False

def select(obj,keys):
 if not isinstance(obj,dict):raise ValueError('Expected an object')
 result={}
 for key in keys:
  if key in obj:
   value=obj[key]
   if not isinstance(value,str) or len(value)>6000:raise ValueError('Expected bounded text in '+key)
   result[key]=value.replace('\u2014',', ')
 return result

def public_data(data,allow_archive=False):
 if not isinstance(data,dict) or data.get('schema_version')!=1:raise ValueError('schema_version 1 required')
 meta=select(data.get('meta'),META)
 try: parsed=date.fromisoformat(meta['date_iso'])
 except (KeyError,ValueError):raise ValueError('Invalid date')
 if not allow_archive and parsed!=datetime.now(ZoneInfo('America/Toronto')).date():raise ValueError('Briefing is not today in Toronto')
 if meta.get('city')!='Toronto' or meta.get('timezone')!='America/Toronto':raise ValueError('Toronto metadata required')
 if not meta.get('date_display'):raise ValueError('Display date required')
 weather=select(data.get('weather'),WEATHER)
 if not weather.get('summary') or not safe_url(weather.get('source_url')):raise ValueError('Sourced weather required')
 out={'schema_version':1,'meta':meta,'weather':weather}
 for name,keys in SECTIONS.items():
  rows=data.get(name)
  # Optional sections default to empty so older payloads keep publishing.
  if rows is None and name in OPTIONAL: rows=[]
  if not isinstance(rows,list) or len(rows)>150:raise ValueError('Invalid section '+name)
  if name=='best_bets' and len(rows)>3:raise ValueError('Maximum three '+name)
  out[name]=[]
  for row in rows:
   cleaned=select(row,keys)
   if name!='venue_checks' and (not cleaned.get('title') or not safe_url(cleaned.get('url'))):raise ValueError('Title and safe source URL required for '+name)
   out[name].append(cleaned)
 if data.get('business_source_note'):
  out['business_source_note']='Sources are linked directly below each story. Reporting reflects the morning research snapshot.'
 if data.get('full_briefing_text'):
  out['meta']['content_note']='Adapted from the original morning scan, not a new research run. Events and headlines are a dated snapshot; only the separately labelled live weather refreshes.'
 return out

def publish(data,destination=ROOT/'data/latest.json',allow_archive=False):
 out=public_data(data,allow_archive=allow_archive)
 payload=json.dumps(out,ensure_ascii=False,indent=2).encode()
 destination=Path(destination);destination.parent.mkdir(parents=True,exist_ok=True)
 lockpath=destination.parent/'.publish.lock'
 with lockpath.open('a') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX)
  fd,tmp=tempfile.mkstemp(prefix='.latest-',suffix='.tmp',dir=destination.parent)
  try:
   with os.fdopen(fd,'wb') as f:f.write(payload);f.flush();os.fsync(f.fileno())
   os.chmod(tmp,0o644)
   os.replace(tmp,destination)
  finally:
   if os.path.exists(tmp):os.unlink(tmp)
 return {'ok':True,'date':out['meta']['date_iso'],'bytes':len(payload),'public_url':'https://today.getphiads.com/','output':str(destination)}

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--input',required=True,type=Path)
 parser.add_argument('--output',type=Path,default=ROOT/'data/latest.json')
 parser.add_argument('--allow-archive',action='store_true',help='For test or recovery only; never daily production')
 args=parser.parse_args()
 if args.input.stat().st_size>2_000_000:raise SystemExit('Input exceeds 2MB')
 try:print(json.dumps(publish(json.loads(args.input.read_text()),args.output,args.allow_archive)))
 except (ValueError,KeyError,TypeError) as exc:raise SystemExit('Publication rejected: '+str(exc))
