/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const async = require('async');
const cfg = bedrock.config['veres-one-validator'];
const voValidator = require('veres-one-validator');
const equihashSigs = require('equihash-signature');
const jsigs = require('jsonld-signatures');
jsigs.use('jsonld', bedrock.jsonld);

const mockData = require('./mock.data');

describe('validateEvent API', () => {
  describe('WebLedgerEvent', () => {
    it('validates a properly signed event', done => {
      async.auto({
        proof: callback => equihashSigs.sign({
          doc: mockData.events.alpha,
          n: cfg.equihash.equihashParameterN,
          k: cfg.equihash.equihashParameterK
        }, callback),
        sign: callback => signDocument({
          creator: mockData.authorizedSigners.alpha,
          privateKeyPem: mockData.keys.alpha.privateKey,
          doc: mockData.events.alpha
        }, callback),
        check: ['proof', 'sign', (results, callback) => {
          const signedDoc = bedrock.util.clone(mockData.events.alpha);
          signedDoc.signature = [
            results.sign.signature,
            results.proof.signature
          ];
          voValidator.validateEvent(
            signedDoc,
            mockData.ledgers.alpha.config.ledgerConfiguration.eventValidator[0],
            err => {
              assertNoError(err);
              callback();
            });
        }]
      }, err => {
        assertNoError(err);
        done();
      });
    });
  }); // end WebLedgerEvent

  describe.skip('WebLedgerConfigurationEvent', () => {
  }); // end WebLedgerConfigurationEvent
});

function signDocument(options, callback) {
  jsigs.sign(options.doc, {
    algorithm: 'LinkedDataSignature2015',
    privateKeyPem: options.privateKeyPem,
    creator: options.creator
  }, (err, result) => {
    if(err) {
      return callback(err);
    }
    callback(null, result);
  });
}
