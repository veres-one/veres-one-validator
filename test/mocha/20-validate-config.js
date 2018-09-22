/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const voValidator = require('veres-one-validator');

const mockData = require('./mock.data');

describe('validateConfiguration API', () => {
  it('validates a proper config', done => {
    const testConfig =
      mockData.ledgerConfigurations.alpha.operationValidator[0];
    voValidator.validateConfiguration(
      testConfig, {ledgerNode: mockData.ledgerNode}, err => {
        assertNoError(err);
        done();
      });
  });
});
