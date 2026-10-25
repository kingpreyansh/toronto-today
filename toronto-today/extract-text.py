import re,sys,html
path=sys.argv[1]
kw=sys.argv[2:] 
t=open(path,encoding='utf-8',errors='ignore').read()
# try embedded JSON-LD / Next data
t2=re.sub(r'<script.*?</script>','',t,flags=re.S)
t2=re.sub(r'<style.*?</style>','',t2,flags=re.S)
txt=html.unescape(re.sub(r'<[^>]+>',' ',t2))
txt=re.sub(r'\s+',' ',txt)
if kw:
    for k in kw:
        for m in re.finditer(re.escape(k),txt,re.I):
            print('...',txt[max(0,m.start()-160):m.start()+200],'...')
            print('---')
else:
    print(txt[:4000])
