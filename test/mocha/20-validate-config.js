/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {util: {clone}} = require('bedrock');
const voValidator = require('veres-one-validator');

const mockData = require('./mock.data');

describe('validateConfiguration API', () => {
  it('validates a proper validator config', async () => {
    const validatorConfig =
      mockData.ledgerConfigurations.alpha.operationValidator[0];
    let err;
    let result;
    try {
      result = await voValidator.validateConfiguration({validatorConfig});
    } catch(e) {
      err = e;
    }
    assertNoError(err);
    result.valid.should.be.a('boolean');
    result.valid.should.be.true;
  });
  it('rejects a config with missing validatorFilter', async () => {
    const validatorConfig =
      clone(mockData.ledgerConfigurations.alpha.operationValidator[0]);
    delete validatorConfig.validatorFilter;
    let err;
    let result;
    try {
      result = await voValidator.validateConfiguration({validatorConfig});
    } catch(e) {
      err = e;
    }
    assertNoError(err);
    result.valid.should.be.a('boolean');
    result.valid.should.be.false;
    should.exist(result.error);
    result.error.name.should.equal('ValidationError');
  });
  describe('validatorParameterSet', () => {
    it('rejects a config with missing validatorParameterSet', async () => {
      const validatorConfig =
        clone(mockData.ledgerConfigurations.alpha.operationValidator[0]);
      delete validatorConfig.validatorParameterSet;
      let err;
      let result;
      try {
        result = await voValidator.validateConfiguration({validatorConfig});
      } catch(e) {
        err = e;
      }
      assertNoError(err);
      result.valid.should.be.a('boolean');
      result.valid.should.be.false;
      should.exist(result.error);
      result.error.name.should.equal('ValidationError');
    });
    it('rejects a config with invalid validatorParameterSet', async () => {
      const validatorConfig =
        clone(mockData.ledgerConfigurations.alpha.operationValidator[0]);
      validatorConfig.validatorParameterSet = 'did:v1:foo';
      let err;
      let result;
      try {
        result = await voValidator.validateConfiguration({validatorConfig});
      } catch(e) {
        err = e;
      }
      assertNoError(err);
      result.valid.should.be.a('boolean');
      result.valid.should.be.false;
      should.exist(result.error);
      result.error.name.should.equal('ValidationError');
    });
  });
});
