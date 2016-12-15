import should from 'should';

import { shortenString } from './label-utils';

describe('shortenString', function() {

  it('Does not affect short strings', function() {
    shortenString('ab', 3).should.be.exactly('ab');
  });

  it('Does not affect barely short enough strings', function() {
    shortenString('abc', 3).should.be.exactly('abc');
  });

  it('truncates and adds ellipsis to long strings', function() {
    shortenString('abcd', 3).should.be.exactly('ab…');
  });

});
