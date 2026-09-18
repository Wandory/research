import io
head=io.open('_head.html',encoding='utf-8').read()
css=io.open('_extra.css',encoding='utf-8').read()
body=io.open('_body.html',encoding='utf-8').read()
charts=io.open('_charts.html',encoding='utf-8').read()
script=io.open('_script.html',encoding='utf-8').read()
data=io.open('_data.json',encoding='utf-8').read()
assert '</style>' in head
head=head.replace('</style>', css+'\n</style>',1) if css not in head else head
out=head+'\n'+body+'\n'+script+'\n'+charts.replace('__DATA__',data)
io.open('research-portfolio.html','w',encoding='utf-8').write(out)
print(len(out))
