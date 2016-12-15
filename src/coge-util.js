const BASE_URL = 'http://genomevolution.org/coge/';

/*
 * Generate a link to a sequence comparison page on CoGe for a pair of
 * chromosomes, identified by their CoGe database IDs.
 */
exports.genCogeSequenceLink = (id1, id2) =>
    BASE_URL + `GEvo.pl?fid1=${id1};fid2=${id2};apply_all=50000;num_seqs=2`;
