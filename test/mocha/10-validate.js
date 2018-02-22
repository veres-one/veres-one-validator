/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const async = require('async');
const config = bedrock.config;
const cfg = config['veres-one-validator'];
const didv1 = require('did-veres-one');
const voValidator = require('veres-one-validator');
const equihashSigs = require('equihash-signature');
const jsigs = require('jsonld-signatures');
jsigs.use('jsonld', bedrock.jsonld);
equihashSigs.install(jsigs);
didv1.use('jsonld', bedrock.jsonld);
didv1.use('jsonld-signatures', jsigs);

const mockData = require('./mock.data');

//Note: ocap action name for accelerator-endorsed op
//capabilityAction: 'AuthorizeRequest',
const capabilityAction = 'RegisterDid';
// RegisterDid, UpdateDidDocument

describe('validate API', () => {
  describe('operationValidator', () => {
    it('validates an operation with proper proofs', done => {
      async.auto({
        capability: callback => didv1.attachInvocationProof({
          operation: mockData.operations.alpha,
          capability: mockData.operations.alpha,
          capabilityAction,
          creator: mockData.privateDidDocuments.alpha
            .invokeCapability[0].publicKey[0].id,
          privateKeyPem: mockData.privateDidDocuments.alpha
            .invokeCapability[0].publicKey[0].privateKey.privateKeyPem
        }, callback),
        pow: ['capability', (results, callback) => didv1.attachEquihashProof({
          operation: results.capability,
          parameters: {
            n: cfg.equihash.equihashParameterN,
            k: cfg.equihash.equihashParameterK
          }
        }, callback)],
        check: ['pow', (results, callback) => voValidator.validate(
          results.pow,
          mockData.ledgerConfigurations.alpha.operationValidator[0],
          {ledgerNode: mockData.ledgerNode},
          err => {
            assertNoError(err);
            callback();
          })]
      }, done);
    });
    it('validates an operation with extra LD proof', done => {
      async.auto({
        capability: callback => didv1.attachInvocationProof({
          operation: mockData.operations.alpha,
          capability: mockData.operations.alpha,
          capabilityAction,
          creator: mockData.privateDidDocuments.alpha
            .invokeCapability[0].publicKey[0].id,
          privateKeyPem: mockData.privateDidDocuments.alpha
            .invokeCapability[0].publicKey[0].privateKey.privateKeyPem
        }, callback),
        pow: ['capability', (results, callback) => jsigs.sign(
          results.capability, {
            algorithm: 'EquihashProof2018',
            parameters: {
              n: cfg.equihash.equihashParameterN,
              k: cfg.equihash.equihashParameterK
            }
          }, callback)],
        // add a random additional LD signature
        extraSign: ['pow', (results, callback) => signDocument({
          creator: mockData.authorizedSigners.beta,
          privateKeyPem: mockData.keys.beta.privateKey,
          doc: results.pow
        }, callback)],
        check: ['extraSign', (results, callback) => voValidator.validate(
          results.extraSign,
          mockData.ledgerConfigurations.alpha.operationValidator[0],
          {ledgerNode: mockData.ledgerNode},
          err => {
            assertNoError(err);
            callback();
          })]
      }, done);
    });
    it('validation fails if Equihash proof is missing', done => {
      async.auto({
        capability: callback => didv1.attachInvocationProof({
          operation: mockData.operations.alpha,
          capability: mockData.operations.alpha,
          capabilityAction,
          creator: mockData.privateDidDocuments.alpha
            .invokeCapability[0].publicKey[0].id,
          privateKeyPem: mockData.privateDidDocuments.alpha
            .invokeCapability[0].publicKey[0].privateKey.privateKeyPem
        }, callback),
        check: ['capability', (results, callback) => voValidator.validate(
          results.capability,
          mockData.ledgerConfigurations.alpha.operationValidator[0],
          {ledgerNode: mockData.ledgerNode},
          err => {
            should.exist(err);
            err.name.should.equal('ValidationError');
            callback();
          })]
      }, done);
    });
    it('validation fails if capability invocation proof and extra LD ' +
      'proof, but no Equihash', done => {
      async.auto({
        capability: callback => didv1.attachInvocationProof({
          operation: mockData.operations.alpha,
          capability: mockData.operations.alpha,
          capabilityAction,
          creator: mockData.privateDidDocuments.alpha
            .invokeCapability[0].publicKey[0].id,
          privateKeyPem: mockData.privateDidDocuments.alpha
            .invokeCapability[0].publicKey[0].privateKey.privateKeyPem
        }, callback),
        extraSign: ['capability', (results, callback) => signDocument({
          creator: mockData.authorizedSigners.beta,
          privateKeyPem: mockData.keys.beta.privateKey,
          doc: results.capability
        }, callback)],
        check: ['extraSign', (results, callback) => voValidator.validate(
          results.extraSign,
          mockData.ledgerConfigurations.alpha.operationValidator[0],
          {ledgerNode: mockData.ledgerNode},
          err => {
            should.exist(err);
            err.name.should.equal('PermissionDenied');
            callback();
          })]
      }, done);
    });
    it('validation fails if capability invocation proof is missing', done => {
      async.auto({
        pow: callback => didv1.attachEquihashProof({
          operation: mockData.operations.alpha,
          parameters: {
            n: cfg.equihash.equihashParameterN,
            k: cfg.equihash.equihashParameterK
          }
        }, callback),
        check: ['pow', (results, callback) => voValidator.validate(
          results.pow,
          mockData.ledgerConfigurations.alpha.operationValidator[0],
          {ledgerNode: mockData.ledgerNode},
          err => {
            should.exist(err);
            err.name.should.equal('ValidationError');
            callback();
          })]
      }, done);
    });
    it.skip('validation fails if the capability invocation proof is not by ' +
      'an authorized invocation key', done => {
      async.auto({
        capability: callback => didv1.attachInvocationProof({
          operation: mockData.operations.alpha,
          capability: mockData.operations.alpha,
          capabilityAction,
          // use `authentication` key instead
          creator: mockData.privateDidDocuments.alpha
            .authentication[0].publicKey[0].id,
          privateKeyPem: mockData.privateDidDocuments.alpha
            .authentication[0].publicKey[0].privateKey.privateKeyPem
        }, callback),
        pow: ['capability', (results, callback) => didv1.attachEquihashProof({
          operation: results.capability,
          parameters: {
            n: cfg.equihash.equihashParameterN,
            k: cfg.equihash.equihashParameterK
          }
        }, callback)],
        check: ['pow', (results, callback) => voValidator.validate(
          results.pow,
          mockData.ledgerConfigurations.alpha.operationValidator[0],
          {ledgerNode: mockData.ledgerNode},
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
              mockData.didDocuments.alpha.invokeCapability[0].publicKey[0].id);
            callback();
          })]
      }, done);
    });
    it.skip('validation fails if the capability invocation proof is not valid', done => {
      async.auto({
        capability: callback => didv1.attachInvocationProof({
          operation: mockData.operations.alpha,
          capability: mockData.operations.alpha,
          capabilityAction,
          creator: mockData.privateDidDocuments.alpha
            .invokeCapability[0].publicKey[0].id,
          privateKeyPem: mockData.privateDidDocuments.alpha
            .invokeCapability[0].publicKey[0].privateKey.privateKeyPem
        }, (err, result) => {
          if(err) {
            return callback(err);
          }
          result.proof['bogus:stuff'] = 'injection';
          callback(null, result);
        }),
        pow: ['capability', (results, callback) => didv1.attachEquihashProof({
          operation: results.capability,
          parameters: {
            n: cfg.equihash.equihashParameterN,
            k: cfg.equihash.equihashParameterK
          }
        }, callback)],
        check: ['pow', (results, callback) => voValidator.validate(
          results.pow,
          mockData.ledgerConfigurations.alpha.operationValidator[0],
          {ledgerNode: mockData.ledgerNode},
          err => {
            console.log('err', err);
            should.exist(err);
            err.name.should.equal('ValidationError');
            should.exist(err.details.keyResults);
            const keyResults = err.details.keyResults;
            keyResults.should.be.an('array');
            keyResults.should.have.length(1);
            keyResults[0].should.be.an('object');
            keyResults[0].verified.should.be.false;
            keyResults[0].publicKey.should.equal(
              mockData.didDocuments.alpha.invokeCapability[0].publicKey[0].id);
            callback();
          })]
      }, done);
    });
    it.skip('validation fails if incorrect Equihash params were used', done => {
      async.auto({
        capability: callback => didv1.attachInvocationProof({
          operation: mockData.operations.alpha,
          capability: mockData.operations.alpha,
          capabilityAction,
          creator: mockData.privateDidDocuments.alpha
            .invokeCapability[0].publicKey[0].id,
          privateKeyPem: mockData.privateDidDocuments.alpha
            .invokeCapability[0].publicKey[0].privateKey.privateKeyPem
        }, callback),
        pow: ['capability', (results, callback) => didv1.attachEquihashProof({
          operation: results.capability,
          parameters: {
            // NOTE: incorrect parameters are used here
            n: 60,
            k: 4
          }
        }, callback)],
        check: ['pow', (results, callback) => voValidator.validate(
          results.pow,
          mockData.ledgerConfigurations.alpha.operationValidator[0],
          {ledgerNode: mockData.ledgerNode},
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
          })]
      }, done);
    });
    it.skip('validation fails if the Equihash proof is not valid', done => {
      async.auto({
        capability: callback => didv1.attachInvocationProof({
          operation: mockData.operations.alpha,
          capability: mockData.operations.alpha,
          capabilityAction,
          creator: mockData.privateDidDocuments.alpha
            .invokeCapability[0].publicKey[0].id,
          privateKeyPem: mockData.privateDidDocuments.alpha
            .invokeCapability[0].publicKey[0].privateKey.privateKeyPem
        }, callback),
        pow: ['capability', (results, callback) => didv1.attachEquihashProof({
          operation: Object.assign(
            {'bogus:stuff': 'invalid'}, results.capability),
          parameters: {
            n: cfg.equihash.equihashParameterN,
            k: cfg.equihash.equihashParameterK
          }
        }, callback)],
        check: ['pow', (results, callback) => {
          delete results.pow['bogus:stuff'];
          voValidator.validate(
          results.pow,
          mockData.ledgerConfigurations.alpha.operationValidator[0],
          {ledgerNode: mockData.ledgerNode},
          err => {
            should.exist(err);
            err.name.should.equal('ValidationError');
            should.exist(err.details.event);
            callback();
          });
        }]
      }, done);
    });
    it('validation fails if the operation is not `CreateWebLedgerRecord`', done => {
      const operation = bedrock.util.clone(mockData.operations.alpha);
      operation.type = 'UnknownOperation';
      async.auto({
        capability: callback => didv1.attachInvocationProof({
          operation: operation,
          capability: operation,
          capabilityAction,
          creator: mockData.privateDidDocuments.alpha
            .invokeCapability[0].publicKey[0].id,
          privateKeyPem: mockData.privateDidDocuments.alpha
            .invokeCapability[0].publicKey[0].privateKey.privateKeyPem
        }, callback),
        pow: ['capability', (results, callback) => didv1.attachEquihashProof({
          operation: results.capability,
          parameters: {
            n: cfg.equihash.equihashParameterN,
            k: cfg.equihash.equihashParameterK
          }
        }, callback)],
        check: ['pow', (results, callback) => voValidator.validate(
          results.pow,
          mockData.ledgerConfigurations.alpha.operationValidator[0],
          {ledgerNode: mockData.ledgerNode},
          err => {
            should.exist(err);
            // FIXME: do we want to use `NotSupportedError` here?
            //err.name.should.equal('NotSupportedError');
            err.name.should.equal('ValidationError');
            // should.exist(err.details.supportedOperation);
            // err.details.supportedOperation.should.be.an('array');
            // err.details.supportedOperation.should.have.same.members([
            //   'CreateWebLedgerRecord']);
            callback();
          })]
      }, done);
    });
    it('validation fails if `record.id` is not a valid veres one DID', done => {
      const operation = bedrock.util.clone(mockData.operations.alpha);
      operation.record.id = 'bogus';
      async.auto({
        capability: callback => didv1.attachInvocationProof({
          operation: operation,
          capability: operation,
          capabilityAction,
          creator: mockData.privateDidDocuments.alpha
            .invokeCapability[0].publicKey[0].id,
          privateKeyPem: mockData.privateDidDocuments.alpha
            .invokeCapability[0].publicKey[0].privateKey.privateKeyPem
        }, callback),
        pow: ['capability', (results, callback) => didv1.attachEquihashProof({
          operation: results.capability,
          parameters: {
            n: cfg.equihash.equihashParameterN,
            k: cfg.equihash.equihashParameterK
          }
        }, callback)],
        check: ['pow', (results, callback) => voValidator.validate(
          results.pow,
          mockData.ledgerConfigurations.alpha.operationValidator[0],
          {ledgerNode: mockData.ledgerNode},
          err => {
            should.exist(err);
            err.name.should.equal('ValidationError');
            callback();
          })]
      }, done);
    });
    it('validation fails if `record.id` is a `nym` with a fingerprint that ' +
      'does not match `record.authentication[0].publicKey`', done => {
      const operation = bedrock.util.clone(mockData.operations.alpha);
      operation.record.id = 'did:v1:test:nym:bogus';
      async.auto({
        capability: callback => didv1.attachInvocationProof({
          operation: operation,
          capability: operation,
          capabilityAction,
          creator: mockData.privateDidDocuments.alpha
            .invokeCapability[0].publicKey[0].id,
          privateKeyPem: mockData.privateDidDocuments.alpha
            .invokeCapability[0].publicKey[0].privateKey.privateKeyPem
        }, callback),
        pow: ['capability', (results, callback) => didv1.attachEquihashProof({
          operation: results.capability,
          parameters: {
            n: cfg.equihash.equihashParameterN,
            k: cfg.equihash.equihashParameterK
          }
        }, callback)],
        check: ['pow', (results, callback) => voValidator.validate(
          results.pow,
          mockData.ledgerConfigurations.alpha.operationValidator[0],
          {ledgerNode: mockData.ledgerNode},
          err => {
            should.exist(err);
            err.name.should.equal('ValidationError');
            callback();
          })]
      }, done);
    });
  });
});

function signDocument(options, callback) {
  jsigs.sign(options.doc, {
    algorithm: 'RsaSignature2018',
    privateKeyPem: options.privateKeyPem,
    creator: options.creator
  }, (err, result) => {
    if(err) {
      return callback(err);
    }
    callback(null, result);
  });
}
