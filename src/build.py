import io,sys
def build(css,body,js,data,out,title):
    c=io.open(css,encoding='utf-8').read()
    b=io.open(body,encoding='utf-8').read()
    j=io.open(js,encoding='utf-8').read()
    d=io.open(data,encoding='utf-8').read()
    io.open(out,'w',encoding='utf-8').write('<title>'+title+'</title>\n'+c+'\n'+b+'\n'+j.replace('__DATA__',d))
    print(out)
if __name__=='__main__': build(*sys.argv[1:7])
