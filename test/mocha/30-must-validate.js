/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {util: {clone}} = require('bedrock');
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
    it('returns true on an CreateWebLedgerRecord operation', async () => {
      const operation = clone(mockData.operations.create);
      const testConfig =
        mockData.ledgerConfigurations.alpha.operationValidator[0];

      operation.type = 'UnknownOperationType';

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
      result.should.be.false;
    });
    it('throws an CreateWebLedgerRecord with invalid config', async () => {
      const operation = mockData.operations.create;
      const testConfig = clone(
        mockData.ledgerConfigurations.alpha.operationValidator[0]);
      let result;
      let err;

      delete testConfig.validatorParameterSet;

      try {
        result = await voValidator.mustValidate({
          validatorInput: operation,
          validatorConfig: testConfig,
        });
      } catch(e) {
        err = e;
      }
      should.not.exist(result);
      should.exist(err);
      err.name.should.equal('ValidationError');
      err.message.should.contain('Veres One Validator Configuration');
    });
    it('should return true on a WebLedgerConfiguration', async () => {
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
      result.should.be.true;
    });
  });
});
