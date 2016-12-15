Requirements
============

Make sure you have a relatively recent version of node (v4.1.1 is
known to work).

To build, do

```
npm run build
```

And for production (minifed, deduped)

```
npm run build-production
```

See `package.json` for more build options and scripts.


Example
=======

```
makeSyntenyDotplots({
  data_url: "my-server/11691.22557.ks",  // path to a .ks file

  element_id: "#myDiv",          // id of the div you want the 
                      // plots to be put in

  genome_x: {

    name: "Pan Troglodytes",      // English name of the genome 
                      // (for plot axes)

    id: "11691",            // ID number (usually some digits)

    chromosomes: [
      {
        gene_count: 2319,      // ignored for now

        length: 115123233,      // length of the chromosome 
                      // in neucleotide space

        name: "1"
      }
    ]
  },

  genome_y: {
    ...                  // same as above
  }

  gen_coge_seq_link: function(aId, bId) {
    // Create a URL for a CoGe sequence comparison. This will override the
    // default link generation scheme, which defaults to
    // 'http://genomevolution.org/coge/GEvo.pl?fid1=42;fid2=24;apply_all=50000;num_seqs=2'
    return 'https://www.google.com#q=' + aId + '+' + bId;
  }
});
```
