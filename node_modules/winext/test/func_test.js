require('mocha');
const lodash = require('lodash');
const expect = require('chai').expect;
const lookup = require('../utils/lookup');

describe('lookup', () => {
  let requireLodash;
  it('should be return lodash require in dependencies server', () => {
    requireLodash = lookup('lodash');
    expect(requireLodash).to.equal(lodash);
  })
  it('should be return null if not required in dependencies', () => {
    requireLodash = lookup('express');
    expect(requireLodash).to.equal(null);
  })
});