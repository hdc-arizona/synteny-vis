import should from 'should';

import { computeBaseUrl } from '../src/coge-util';

describe('computeBaseUrl', function() {

  it('should derive from known urls correctly', function() {

    computeBaseUrl({
      origin: 'https://genomevolution.org',
      hostname: 'genomevolution.org',
      pathname: '/coge/SynMap.pl'
    }).should.equal('https://genomevolution.org/coge');

    computeBaseUrl({
      origin: 'https://geco.iplantc.org',
      hostname: 'geco.iplantc.org',
      pathname: '/coge/SynMap.pl'
    }).should.equal('https://geco.iplantc.org/coge');

    computeBaseUrl({
      origin: 'https://geco.iplantc.org',
      hostname: 'geco.iplantc.org',
      pathname: '/asherkhb/coge/SynMap.pl'
    }).should.equal('https://geco.iplantc.org/asherkhb/coge');

  });

  it('should map localhost onto coge', function() {

    computeBaseUrl({
      hostname: 'localhost',
      pathname: '/index.html'
    }).should.equal('https://genomevolution.org/coge');

  });

});
