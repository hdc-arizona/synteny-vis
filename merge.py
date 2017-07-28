from glob import glob
import os
import json
from natsort import natsorted

def getOffset(gid):
    gid = str(gid)

    with open('build/lengths0/'+gid) as f:
        chrs = json.load(f)['chromosomes']
        chrs = [  (c['name'],c['length']) for c in chrs   ]
        chrs = natsorted(chrs)
    chrNames = [i[0] for i in chrs]
    maxLocations = [i[1] for i in chrs]
    res = {chrName: sum(maxLocations[:chrNames.index(chrName)]) for chrName in chrNames}
    res[''] = sum(maxLocations)
    return res


def isComment(line):
    isComment = line.startswith('#')
    return isComment


def applyOffset(line, offsets1, offsets2):
    if isComment(line):
        return line,line
    line = line.split()
    for i in [3, 7]:
        seg = line[i].split('||')
        chrName = seg[0]
        if i==3:
            start = int(seg[1])+offsets1[chrName]
            stop = int(seg[2])+offsets1[chrName]
        elif i==7:
            start = int(seg[1])+offsets2[chrName]
            stop = int(seg[2])+offsets2[chrName]
        start, stop = str(start), str(stop)
            
        seg[1], seg[2] = start, stop
        line[i] = '||'.join(seg)
        if i==3:
            line[4], line[5] = stop, start
        elif i==7:
            line[8], line[9] = stop, start
    res = '\t'.join(line) + '\n'
    line[2:6], line[6:10] = line[6:10], line[2:6]
    line[2] = 'a' + line[2][1:]
    line[6] = 'b' + line[6][1:]
    res2 = '\t'.join(line) + '\n'
    return res, res2


def changeChrName(line, tonames):
    if isComment(line):
        return line
    line = line.split()
    
    for i,d in enumerate([2,6]):
        a = line[d].split('_')
        a[1] = tonames[i]
        line[d] = '_'.join(a)
    for i,d in enumerate([3,7]):
        a = line[d].split('||')
        a[0] = tonames[i]
        line[d] = '||'.join(a)
    
    return '\t'.join(line) + '\n'


def deleteUnusedFields(line):
    if isComment(line):
        return line
    line =  line.split()
    for i in [3,7]:
        l = line[i].split('||')
        l[3:9] = ['_'] * 6
        line[i] = '||'.join(l)
    return '\t'.join(line) + '\n'


def test_singleline():
    off1 = getOffset(6807)
    off2 = getOffset(8082)
    print off1, off2
    line = '0.1738  0.0081  a6807_4 4||54946689||54949182||Sb04g025090||-1||CDS||19484486||19363||95.64 54949182    54946689    b8082_5 5||180599163||180602043||GRMZM2G029583||1||CDS||56309405||28121||95.64  180599163   180602043   1.000000e-250   11685'
    #line = deleteUnusedFields(line)
    print line
    line, line = applyOffset(line, off1, off2)
    line = changeChrName(line, ['jack', 'alice'])
    print line


def test_file():
    gid1 = '6807'
    gid2 = '8082'
    off1 = getOffset(gid1)
    off2 = getOffset(gid2)

    fn = glob('build/data/'+gid1+'_'+gid2+'*.ks')[0]
    with open(fn) as f:
        for line in f.readlines()[10000:10010:2]:
            print line
            print
            l = applyOffset(line, off1, off2)
            l = changeChrName(l, ['jack','alice'])
            print l
            print '-'*20




def changeKsFile(fns, fnout, dictNames):
    with open(fnout, 'w') as fout:
        for fn in fns:
            gid1, gid2 = fn.split('/')[-1].split('.')[0].split('_')
            off1 = getOffset(gid1)
            off2 = getOffset(gid2)

            with open(fn) as f:
                for line in f:
                    #l0  = deleteUnusedFields(line)
                    l0  = line
                    l1, l2 = applyOffset(l0, off1, off2)
                    l = changeChrName(l1, [dictNames[gid1],dictNames[gid2]])
                    fout.write(l)
                    l = changeChrName(l2, [dictNames[gid2],dictNames[gid1]])
                    fout.write(l)


def test_changeFile():
    gid1 = '6807'
    gid2 = '8082'
    name1 = 'a'
    name2 = 'b'
    fn = glob('build/data0/'+gid1+'_'+gid2+'*.ks')[0]
    fnout = fn.replace('0','',1)

    changeKsFile(fn, fnout, name1, name2)
    changeMetaFile(gid1, name1)
    changeMetaFile(gid2, name2)

    

def test_manyFile():
    with open('build/plasmodiumTags.txt') as f:
        lines = [l.replace('\n','') for l in f.readlines()]
        gids = [line.split(',')[1] for line in lines]
        names = [str(i)+line.split(',')[0] for i,line in enumerate(lines)]
    print names
    filename = '3p'
    gids = gids[:10]
    names = names[:10]
    print gids
    dictNames = dict(zip(gids, names))
    changeMetaFile(gids, names, filename+'.json')

    
    fns = []
    for fn in glob('build/data0/plasmodium/*.ks'):
        gid1, gid2 = fn.split('/')[-1].split('.')[0].split('_')
        if gid1 in gids and gid2 in gids:
            fns.append(fn)
    fnout = 'build/data/'+filename+'.ks'
    print fns
    try:
        os.remove(fnout)
    except OSError:
        pass
    changeKsFile(fns,  fnout, dictNames)
            



def changeMetaFile(gids, names, fnout):
    with open('build/lengths0/6807.json') as f:
        j = json.load(f)
    j['chromosomes'] = []
    for gid, name in zip(gids, names):
        off = getOffset(gid)
        j['chromosomes'].append( {'name':name, 'length':off[''], 'gene_count':99999} )
    
    with open('build/lengths/'+fnout, 'w') as f:
        json.dump(j, f)
        
              
if __name__ == '__main__':
   test_manyFile()
   #test_singleline()
