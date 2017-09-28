/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const async = require('async');
const config = bedrock.config;
const cfg = config['veres-one-validator'];
const constants = config.constants;
const voValidator = require('veres-one-validator');
const equihashSigs = require('equihash-signature');
const jsigs = require('jsonld-signatures');
jsigs.use('jsonld', bedrock.jsonld);
equihashSigs.use('jsonld', bedrock.jsonld);

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
    it('validates an event with extra jsonld-signatures', done => {
      async.auto({
        proof: callback => equihashSigs.sign({
          doc: mockData.events.alpha,
          n: cfg.equihash.equihashParameterN,
          k: cfg.equihash.equihashParameterK
        }, callback),
        signAlpha: callback => signDocument({
          creator: mockData.authorizedSigners.alpha,
          privateKeyPem: mockData.keys.alpha.privateKey,
          doc: mockData.events.alpha
        }, callback),
        signBeta: callback => signDocument({
          creator: mockData.authorizedSigners.beta,
          privateKeyPem: mockData.keys.beta.privateKey,
          doc: mockData.events.alpha
        }, callback),
        check: ['proof', 'signAlpha', 'signBeta', (results, callback) => {
          const signedDoc = bedrock.util.clone(mockData.events.alpha);
          signedDoc.signature = [
            results.signBeta.signature,
            results.proof.signature,
            results.signAlpha.signature,
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
    it('validation fails if Equihash signature is missing', done => {
      async.auto({
        sign: callback => signDocument({
          creator: mockData.authorizedSigners.alpha,
          privateKeyPem: mockData.keys.alpha.privateKey,
          doc: mockData.events.alpha
        }, callback),
        check: ['sign', (results, callback) => {
          const signedDoc = bedrock.util.clone(mockData.events.alpha);
          signedDoc.signature = [
            results.sign.signature
          ];
          voValidator.validateEvent(
            signedDoc,
            mockData.ledgers.alpha.config.ledgerConfiguration.eventValidator[0],
            err => {
              should.exist(err);
              err.name.should.equal('ValidationError');
              should.exist(err.details.event);
              should.exist(err.details.requiredEquihashParams);
              const p = err.details.requiredEquihashParams;
              p.should.be.an('object');
              p.equihashParameterN.should.equal(
                cfg.equihash.equihashParameterN);
              p.equihashParameterK.should.equal(
                cfg.equihash.equihashParameterK);
              callback();
            });
        }]
      }, err => {
        assertNoError(err);
        done();
      });
    });
    it('validation fails if two jsonld-signatures and no Equihash', done => {
      async.auto({
        sign: callback => signDocument({
          creator: mockData.authorizedSigners.alpha,
          privateKeyPem: mockData.keys.alpha.privateKey,
          doc: mockData.events.alpha
        }, callback),
        check: ['sign', (results, callback) => {
          const signedDoc = bedrock.util.clone(mockData.events.alpha);
          signedDoc.signature = [
            results.sign.signature,
            results.sign.signature
          ];
          voValidator.validateEvent(
            signedDoc,
            mockData.ledgers.alpha.config.ledgerConfiguration.eventValidator[0],
            err => {
              should.exist(err);
              err.name.should.equal('ValidationError');
              should.exist(err.details.event);
              should.exist(err.details.requiredEquihashParams);
              const p = err.details.requiredEquihashParams;
              p.should.be.an('object');
              p.equihashParameterN.should.equal(
                cfg.equihash.equihashParameterN);
              p.equihashParameterK.should.equal(
                cfg.equihash.equihashParameterK);
              callback();
            });
        }]
      }, err => {
        assertNoError(err);
        done();
      });
    });
    it('validation fails if jsonld-signature is missing', done => {
      async.auto({
        proof: callback => equihashSigs.sign({
          doc: mockData.events.alpha,
          n: cfg.equihash.equihashParameterN,
          k: cfg.equihash.equihashParameterK
        }, callback),
        check: ['proof', (results, callback) => {
          const signedDoc = bedrock.util.clone(mockData.events.alpha);
          signedDoc.signature = [
            results.proof.signature
          ];
          voValidator.validateEvent(
            signedDoc,
            mockData.ledgers.alpha.config.ledgerConfiguration.eventValidator[0],
            err => {
              should.exist(err);
              err.name.should.equal('ValidationError');
              should.exist(err.details.event);
              should.exist(err.details.requiredCreator);
              err.details.requiredCreator.should.equal(
                mockData.events.alpha.input[0].authenticationCredential[0].id);
              callback();
            });
        }]
      }, err => {
        assertNoError(err);
        done();
      });
    });
    it('validation fails if the ld-signature is not by the owner', done => {
      async.auto({
        proof: callback => equihashSigs.sign({
          doc: mockData.events.alpha,
          n: cfg.equihash.equihashParameterN,
          k: cfg.equihash.equihashParameterK
        }, callback),
        sign: callback => signDocument({
          creator: mockData.authorizedSigners.alpha,
          // NOTE: the wrong private key is used here to sign the document
          privateKeyPem: mockData.keys.beta.privateKey,
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
              should.exist(err);
              err.name.should.equal('ValidationError');
              should.exist(err.details.keyResults);
              const keyResults = err.details.keyResults;
              keyResults.should.be.an('array');
              keyResults.should.have.length(1);
              keyResults[0].should.be.an('object');
              keyResults[0].verified.should.be.false;
              keyResults[0].publicKey.should.equal(
                mockData.authorizedSigners.alpha);
              callback();
            });
        }]
      }, err => {
        assertNoError(err);
        done();
      });
    });
    it('validation fails if the ld-signature is not valid', done => {
      async.auto({
        proof: callback => equihashSigs.sign({
          doc: mockData.events.alpha,
          n: cfg.equihash.equihashParameterN,
          k: cfg.equihash.equihashParameterK
        }, callback),
        sign: callback => signDocument({
          creator: mockData.authorizedSigners.alpha,
          privateKeyPem: mockData.keys.alpha.privateKey,
          // NOTE: generating a signature on a bogus document
          doc: {
            '@context': constants.WEB_LEDGER_CONTEXT_V1_URL,
            operation: 'createInvalidSignature'
          }
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
              should.exist(err);
              err.name.should.equal('ValidationError');
              should.exist(err.details.keyResults);
              const keyResults = err.details.keyResults;
              keyResults.should.be.an('array');
              keyResults.should.have.length(1);
              keyResults[0].should.be.an('object');
              keyResults[0].verified.should.be.false;
              keyResults[0].publicKey.should.equal(
                mockData.authorizedSigners.alpha);
              callback();
            });
        }]
      }, err => {
        assertNoError(err);
        done();
      });
    });
    it('validation fails if incorrect equihash params were used', done => {
      async.auto({
        proof: callback => equihashSigs.sign({
          doc: mockData.events.alpha,
          // NOTE: incorrect N parameter is used here
          n: 4,
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
              should.exist(err);
              err.name.should.equal('ValidationError');
              should.exist(err.details.event);
              should.exist(err.details.requiredEquihashParams);
              const p = err.details.requiredEquihashParams;
              p.should.be.an('object');
              p.equihashParameterN.should.equal(
                cfg.equihash.equihashParameterN);
              p.equihashParameterK.should.equal(
                cfg.equihash.equihashParameterK);
              callback();
            });
        }]
      }, err => {
        assertNoError(err);
        done();
      });
    });
    it('validation fails if the Equihash signature is not valid', done => {
      async.auto({
        proof: callback => equihashSigs.sign({
          // NOTE: generating a signature on a bogus document
          doc: {
            '@context': constants.WEB_LEDGER_CONTEXT_V1_URL,
            operation: 'createInvalidSignature'
          },
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
              should.exist(err);
              err.name.should.equal('ValidationError');
              should.exist(err.details.event);
              callback();
            });
        }]
      }, err => {
        assertNoError(err);
        done();
      });
    });
    it('validation fails if the operation is not `Create`', done => {
      const testEvent = bedrock.util.clone(mockData.events.alpha);
      testEvent.operation = 'unknownOperation';
      async.auto({
        proof: callback => equihashSigs.sign({
          doc: testEvent,
          n: cfg.equihash.equihashParameterN,
          k: cfg.equihash.equihashParameterK
        }, callback),
        sign: callback => signDocument({
          creator: mockData.authorizedSigners.alpha,
          privateKeyPem: mockData.keys.alpha.privateKey,
          doc: testEvent
        }, callback),
        check: ['proof', 'sign', (results, callback) => {
          const signedDoc = bedrock.util.clone(testEvent);
          signedDoc.signature = [
            results.sign.signature,
            results.proof.signature
          ];
          voValidator.validateEvent(
            signedDoc,
            mockData.ledgers.alpha.config.ledgerConfiguration.eventValidator[0],
            err => {
              should.exist(err);
              err.name.should.equal('NotSupportedError');
              should.exist(err.details.supportedOperation);
              err.details.supportedOperation.should.be.an('array');
              err.details.supportedOperation.should.have.same.members([
                'Create']);
              callback();
            });
        }]
      }, err => {
        assertNoError(err);
        done();
      });
    });
    it('validation fails if `permission` is not `UpdateDidDocument`', done => {
      const testEvent = bedrock.util.clone(mockData.events.alpha);
      testEvent.input[0].authorizationCapability[0].permission =
        'unknownPermission';
      async.auto({
        proof: callback => equihashSigs.sign({
          doc: testEvent,
          n: cfg.equihash.equihashParameterN,
          k: cfg.equihash.equihashParameterK
        }, callback),
        sign: callback => signDocument({
          creator: mockData.authorizedSigners.alpha,
          privateKeyPem: mockData.keys.alpha.privateKey,
          doc: testEvent
        }, callback),
        check: ['proof', 'sign', (results, callback) => {
          const signedDoc = bedrock.util.clone(testEvent);
          signedDoc.signature = [
            results.sign.signature,
            results.proof.signature
          ];
          voValidator.validateEvent(
            signedDoc,
            mockData.ledgers.alpha.config.ledgerConfiguration.eventValidator[0],
            err => {
              should.exist(err);
              err.name.should.equal('DataError');
              callback();
            });
        }]
      }, err => {
        assertNoError(err);
        done();
      });
    });
  }); // end WebLedgerEvent
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
