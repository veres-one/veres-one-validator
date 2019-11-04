/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

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
});
