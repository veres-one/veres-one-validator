/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const voValidator = require('veres-one-validator');
const mockData = require('./mock.data');

describe('mustValidate API', () => {
  describe('operationValidator', () => {
    it('should return true on an CreateWebLedgerRecord operation', done => {
      const operation = mockData.operations.create;
      const testConfig =
        mockData.ledgerConfigurations.alpha.operationValidator[0];
      voValidator.mustValidate(
        operation, testConfig, {ledgerNode: mockData.ledgerNode},
        (err, result) => {
          assertNoError(err);
          should.exist(result);
          result.should.be.a('boolean');
          result.should.be.true;
          done();
        });
    });
    it('should return false on a WebLedgerConfiguration', done => {
      const ledgerConfiguration = mockData.ledgerConfigurations.alpha;
      const testConfig =
        mockData.ledgerConfigurations.alpha.operationValidator[0];
      voValidator.mustValidate(
        ledgerConfiguration, testConfig, {ledgerNode: mockData.ledgerNode},
        (err, result) => {
          assertNoError(err);
          should.exist(result);
          result.should.be.a('boolean');
          result.should.be.false;
          done();
        });
    });
  });
});
