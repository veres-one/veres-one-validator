/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const voValidator = require('veres-one-validator');
const mockData = require('./mock.data');

describe('mustValidate API', () => {
  describe('operationValidator', () => {
    it('returns true on an CreateWebLedgerRecord operation', async () => {
      const operation = mockData.operations.create;
      const testConfig =
        mockData.ledgerConfigurations.alpha.operationValidator[0];
      let result;
      let err;
      try {
        result = await voValidator.mustValidate({
          validatorInput: operation,
          validatorConfig: testConfig,
        });
      } catch(e) {
        err = e;
      }
      assertNoError(err);
      should.exist(result);
      result.should.be.a('boolean');
      result.should.be.true;
    });
    it('should return false on a WebLedgerConfiguration', async () => {
      const ledgerConfiguration = mockData.ledgerConfigurations.alpha;
      const testConfig =
        mockData.ledgerConfigurations.alpha.operationValidator[0];
      let result;
      let err;
      try {
        result = await voValidator.mustValidate({
          validatorInput: ledgerConfiguration,
          validatorConfig: testConfig,
        });
      } catch(e) {
        err = e;
      }
      assertNoError(err);
      should.exist(result);
      result.should.be.a('boolean');
      result.should.be.false;
    });
  });
});
