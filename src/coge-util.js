/*
 * Compute the effective "base" of the coge site url. This is not
 * quite the same as `window.location.origin`, since we include elements of
 * the pathname that seem to be constant for many site pages, i.e.,
 *
 * "https://genomevolution.org/coge/"
 *
 * Instead of
 *
 * https://genomevolution.org
 *
 * This lets coge developers use this function unmodified during
 * development in sandboxes, but if working locally we re-direct to
 * the official endpoints.
 *
 * The parameter is a Location like object.
 */
const BASE_PATH_FOR_DEV = 'https://genomevolution.org/coge';

const computeBaseUrl = loc => {

  const path = loc.origin + loc.pathname;
  if(path.endsWith('/SynMap.pl')) {
    return path.substring(0, path.length - '/SynMap.pl'.length);
  }

  if(loc.hostname !== 'localhost') {
    console.log(`Warning: Not sure how to convert the current href ` +
                `"${loc.href}" into a "base" URL. Using ` +
                `"${BASE_PATH_FOR_DEV}" instead.`);
  }

  return BASE_PATH_FOR_DEV;
}

exports.computeBaseUrl = computeBaseUrl;

/*
 * Generate a link to a sequence comparison page on CoGe for a pair of
 * chromosomes, identified by their CoGe database IDs.
 */
exports.genCogeSequenceLink = (id1, id2, loc = window.location) =>
    computeBaseUrl(loc) + `/GEvo.pl?fid1=${id1};fid2=${id2};apply_all=50000;num_seqs=2`;
