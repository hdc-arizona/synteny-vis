import d3 from 'd3';
import queue from 'd3-queue';
import sv from './synteny-vis';
import { timeIt, zipObject } from './utils';
import { genCogeSequenceLink } from './coge-util';
import { inlineKSData,
         chromosomesToCumulativeBPCounts } from './chromosomeUtils.js';
import { createDataObj } from './dataObject';

exports.makeSyntenyDotPlot = function({
  data_url,
  element_id,
  genome_x,
  genome_y,
  gen_coge_seq_link
}) {
  if (gen_coge_seq_link === undefined) {
    gen_coge_seq_link = genCogeSequenceLink;
  }
  
  queue.queue()
    .defer(d3.text, data_url)
    .await(function(err, ks) {
      if (err) {
        console.log(err);
        return;
      }

      // Dirty hacks to make files with no ks work:
      const have_ks = data_url.endsWith('.ks');
      if (!have_ks) {
        const random = () => Math.random() * 3 + 2;
        ks = ks.split('\n')
          .map(x => x[0] === '#' ? x : `${random()},${random()},` + x)
          .join('\n');
      }

      const x_name = genome_x.name;
      const y_name = genome_y.name;
      const meta = {
        genome_x,
        genome_y,
        x_name,
        y_name,
        have_ks,
        gen_coge_seq_link
      };

      const ksData = ksTextToObjects(ks);
      
      sv.controller(ksData, element_id, meta);
    });
};

function ksTextToObjects(text) {
  /* .ks files are delimited with a combination of tabs and double bars. */
  const csvLines = text
    .replace(/\|\|/g, ',')
    .replace(/\t/g, ',')
    .replace(' ', '')
    .split('\n');

  const dots = csvLines
    .filter(line => line && line[0] !== '#')
    .map(ksLineToSyntenyDot)
    .filter(x => x);

  var min_logks, min_logkn;
  // Don't use "Math.min(...dots)" here because that
  // causes a stack overflow on large datasets.
  dots.forEach(line => {
    if (isFinite(line.logks)) {
      if (min_logks === undefined || line.logks < min_logks) {
        min_logks = line.logks;
      }
    }
    if (isFinite(line.logkn)) {
      if (min_logkn === undefined || line.logkn < min_logkn) {
        min_logkn = line.logkn;
      }
    }
  });

  return dots.map(x => {
    x.logks = isFinite(x.logks) ? x.logks : min_logks;
    x.logkn = isFinite(x.logkn) ? x.logkn : min_logkn;
    x.logknks = x.logkn - x.logks;
    return x;
  });
}

function ksLineToSyntenyDot(line) {
  const fields = line.split(',');

  if(fields[0] === 'NA' || fields[1] === 'NA') {
    return undefined;
  }

  const ks = Number(fields[0]);
  const kn = Number(fields[1]);
  const log10 = n => Math.log(n) / Math.log(10);

  return {
    ks,
    logks: log10(ks),
    kn,
    logkn: log10(kn),
    logknks: log10(kn) - log10(ks),
    x_chromosome_id: fields[3],
    y_chromosome_id: fields[15],
    x_feature_id: fields[9],
    y_feature_id: fields[21],
    x_relative_offset: Math.round((Number(fields[4]) + Number(fields[5])) / 2),
    y_relative_offset: Math.round((Number(fields[16]) + Number(fields[17])) / 2)
  };
}




/* Local Variables:  */
/* mode: js2         */
/* js2-basic-offset: 2 */
/* End:              */
