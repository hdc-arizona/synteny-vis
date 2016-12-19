import should from 'should';

import { shortenString } from './label-utils';

describe('shortenString', function() {

  it('Truncates only if string is too long', function() {
    shortenString('ab',   3).should.be.exactly('ab');
    shortenString('abc',  3).should.be.exactly('abc');
    shortenString('abcd', 3).should.be.exactly('ab…');
  });

});
