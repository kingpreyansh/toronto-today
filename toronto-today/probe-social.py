import json
d=json.load(open('data/social-candidates.json'))
for src in ('luma','eventbrite'):
    print('=====',src)
    for it in d['sources'][src]['events']:
        print('-',it.get('title'))
        print('   start:',it.get('start'),'| venue:',it.get('venue'))
        print('   url:',it.get('url'))
