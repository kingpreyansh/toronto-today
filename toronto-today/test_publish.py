import importlib.util,json,tempfile,unittest
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
spec=importlib.util.spec_from_file_location('publish',Path(__file__).with_name('publish.py'))
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
class PublicDataTest(unittest.TestCase):
 def fixture(self):
  day=datetime.now(ZoneInfo('America/Toronto')).date().isoformat()
  return {'schema_version':1,'meta':{'date_iso':day,'date_display':'Today','city':'Toronto','timezone':'America/Toronto','name':'private name'},'weather':{'summary':'Clear','source_url':'https://weather.gc.ca/'},'best_bets':[],'networking':[],'local_events':[],'business_news':[],'cultural_events':[],'social_options':[],'venue_checks':[],'focus_prompt':'private task','full_briefing_text':'private report','token':'secret'}
 def test_whitelist_excludes_private_fields(self):
  d=self.fixture();d['local_events']=[{'title':'Public concert','url':'https://example.org/event','time':'7 PM','lead_email':'private@x.co'}]
  out=p.public_data(d);serialized=json.dumps(out)
  for secret in ['private','secret','token','full_briefing_text','focus_prompt','lead_email']:self.assertNotIn(secret,serialized)
 def test_invalid_and_stale_rejected(self):
  d=self.fixture();d['meta']['date_iso']='2026-01-01'
  with self.assertRaises(ValueError):p.public_data(d)
  d=self.fixture();d['local_events']=[{'title':'bad','url':'javascript:alert(1)'}]
  with self.assertRaises(ValueError):p.public_data(d)
 def test_atomic_publish_keeps_prior_on_invalid(self):
  with tempfile.TemporaryDirectory() as root:
   dest=Path(root)/'latest.json';p.publish(self.fixture(),dest);original=dest.read_bytes()
   invalid=self.fixture();del invalid['weather']
   with self.assertRaises(ValueError):p.publish(invalid,dest)
   self.assertEqual(dest.read_bytes(),original)
if __name__=='__main__':unittest.main()
