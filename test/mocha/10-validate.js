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

const capabilityActions = {
  authorize: 'AuthorizeRequest',
  register: 'RegisterDid',
  update: 'UpdateDidDocument'
};

// TODO: add an extra identity that is an accelerator (separate from alpha
// and beta)

describe('validate API', () => {
  describe('operationValidator', () => {
    describe('create operation', () => {
      it('validates an operation with proper capability + PoW', done => {
        async.auto({
          capability: callback => didv1.attachInvocationProof({
            operation: mockData.operations.create,
            capability: mockData.didDocuments.alpha,
            capabilityAction: capabilityActions.register,
            creator: mockData.didDocuments.alpha
              .invokeCapability[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.alpha
              .invokeCapability[0].publicKey[0].privateKey.privateKeyBase58
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
            operation: mockData.operations.create,
            capability: mockData.didDocuments.alpha,
            capabilityAction: capabilityActions.register,
            creator: mockData.didDocuments.alpha
              .invokeCapability[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.alpha
              .invokeCapability[0].publicKey[0].privateKey.privateKeyBase58
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
            privateKeyBase58: mockData.privateDidDocuments.beta
              .authentication[0].publicKey[0].privateKey.privateKeyBase58,
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
      it('validates an operation with two proper capabilities, no PoW', done => {
        async.auto({
          registerCapability: callback => didv1.attachInvocationProof({
            operation: mockData.operations.create,
            capability: mockData.didDocuments.alpha,
            capabilityAction: capabilityActions.register,
            creator: mockData.didDocuments.alpha
              .invokeCapability[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.alpha
              .invokeCapability[0].publicKey[0].privateKey.privateKeyBase58
          }, callback),
          authorizeCapability: ['registerCapability', (results, callback) =>
            didv1.attachInvocationProof({
              operation: results.registerCapability,
              capability: mockData.capabilities.authorizeRequest,
              capabilityAction: capabilityActions.authorize,
              creator: mockData.didDocuments.alpha
                .invokeCapability[0].publicKey[0].id,
              privateKeyBase58: mockData.privateDidDocuments.alpha
                .invokeCapability[0].publicKey[0].privateKey.privateKeyBase58
            }, callback)],
          check: ['authorizeCapability', (results, callback) =>
            voValidator.validate(
              results.authorizeCapability,
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
            operation: mockData.operations.create,
            capability: mockData.didDocuments.alpha,
            capabilityAction: capabilityActions.register,
            creator: mockData.didDocuments.alpha
              .invokeCapability[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.alpha
              .invokeCapability[0].publicKey[0].privateKey.privateKeyBase58
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
            operation: mockData.operations.create,
            capability: mockData.didDocuments.alpha,
            capabilityAction: capabilityActions.register,
            creator: mockData.didDocuments.alpha
              .invokeCapability[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.alpha
              .invokeCapability[0].publicKey[0].privateKey.privateKeyBase58
          }, callback),
          extraSign: ['capability', (results, callback) => signDocument({
            creator: mockData.authorizedSigners.beta,
            privateKeyBase58: mockData.privateDidDocuments.beta
              .authentication[0].publicKey[0].privateKey.privateKeyBase58,
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
            operation: mockData.operations.create,
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
            operation: mockData.operations.create,
            capability: mockData.didDocuments.alpha,
            capabilityAction: capabilityActions.register,
            // use `authentication` key instead
            creator: mockData.didDocuments.alpha
              .authentication[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.alpha
              .authentication[0].publicKey[0].privateKey.privateKeyBase58
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
            operation: mockData.operations.create,
            capability: mockData.didDocuments.alpha,
            capabilityAction: capabilityActions.register,
            creator: mockData.didDocuments.alpha
              .invokeCapability[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.alpha
              .invokeCapability[0].publicKey[0].privateKey.privateKeyBase58
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
            operation: mockData.operations.create,
            capability: mockData.didDocuments.alpha,
            capabilityAction: capabilityActions.register,
            creator: mockData.didDocuments.alpha
              .invokeCapability[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.alpha
              .invokeCapability[0].publicKey[0].privateKey.privateKeyBase58
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
            operation: mockData.operations.create,
            capability: mockData.didDocuments.alpha,
            capabilityAction: capabilityActions.register,
            creator: mockData.didDocuments.alpha
              .invokeCapability[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.alpha
              .invokeCapability[0].publicKey[0].privateKey.privateKeyBase58
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
      it('validation fails if the operation type is not supported', done => {
        const operation = bedrock.util.clone(mockData.operations.create);
        operation.type = 'UnknownOperation';
        async.auto({
          capability: callback => didv1.attachInvocationProof({
            operation: operation,
            capability: operation,
            capabilityAction: capabilityActions.register,
            creator: mockData.didDocuments.alpha
              .invokeCapability[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.alpha
              .invokeCapability[0].publicKey[0].privateKey.privateKeyBase58
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
        const operation = bedrock.util.clone(mockData.operations.create);
        operation.record.id = 'bogus';
        async.auto({
          capability: callback => didv1.attachInvocationProof({
            operation: operation,
            capability: operation,
            capabilityAction: capabilityActions.register,
            creator: mockData.didDocuments.alpha
              .invokeCapability[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.alpha
              .invokeCapability[0].publicKey[0].privateKey.privateKeyBase58
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
        const operation = bedrock.util.clone(mockData.operations.create);
        operation.record.id = 'did:v1:test:nym:bogus';
        async.auto({
          capability: callback => didv1.attachInvocationProof({
            operation: operation,
            capability: operation,
            capabilityAction: capabilityActions.register,
            creator: mockData.didDocuments.alpha
              .invokeCapability[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.alpha
              .invokeCapability[0].publicKey[0].privateKey.privateKeyBase58
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

    describe('update operation', () => {
      it('validates an operation with capability proof + PoW', done => {
        async.auto({
          capability: callback => didv1.attachInvocationProof({
            operation: mockData.operations.update,
            capability: mockData.didDocuments.beta,
            capabilityAction: capabilityActions.update,
            creator: mockData.didDocuments.beta
              .invokeCapability[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.beta
              .invokeCapability[0].publicKey[0].privateKey.privateKeyBase58
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
            operation: mockData.operations.update,
            capability: mockData.didDocuments.beta,
            capabilityAction: capabilityActions.update,
            creator: mockData.didDocuments.beta
              .invokeCapability[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.beta
              .invokeCapability[0].publicKey[0].privateKey.privateKeyBase58
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
            creator: mockData.authorizedSigners.alpha,
            privateKeyBase58: mockData.privateDidDocuments.alpha
              .authentication[0].publicKey[0].privateKey.privateKeyBase58,
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
      it('validates an operation with two proper capabilities, no PoW', done => {
        async.auto({
          registerCapability: callback => didv1.attachInvocationProof({
            operation: mockData.operations.update,
            capability: mockData.didDocuments.beta,
            capabilityAction: capabilityActions.update,
            creator: mockData.didDocuments.beta
              .invokeCapability[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.beta
              .invokeCapability[0].publicKey[0].privateKey.privateKeyBase58
          }, callback),
          authorizeCapability: ['registerCapability', (results, callback) =>
            didv1.attachInvocationProof({
              operation: results.registerCapability,
              capability: mockData.capabilities.authorizeRequest,
              capabilityAction: capabilityActions.authorize,
              creator: mockData.didDocuments.beta
                .invokeCapability[0].publicKey[0].id,
              privateKeyBase58: mockData.privateDidDocuments.beta
                .invokeCapability[0].publicKey[0].privateKey.privateKeyBase58
            }, callback)],
          check: ['authorizeCapability', (results, callback) =>
            voValidator.validate(
              results.authorizeCapability,
              mockData.ledgerConfigurations.alpha.operationValidator[0],
              {ledgerNode: mockData.ledgerNode},
              err => {
                assertNoError(err);
                callback();
              })]
        }, done);
      });
      it('should fail to validate an operation with an invalid patch', done => {
        async.auto({
          capability: callback => didv1.attachInvocationProof({
            operation: mockData.operations.updateInvalidPatch,
            capability: mockData.didDocuments.beta,
            capabilityAction: capabilityActions.update,
            creator: mockData.didDocuments.beta
              .invokeCapability[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.beta
              .invokeCapability[0].publicKey[0].privateKey.privateKeyBase58
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
      it('should fail to validate an operation with an invalid change', done => {
        async.auto({
          capability: callback => didv1.attachInvocationProof({
            operation: mockData.operations.updateInvalidChange,
            capability: mockData.didDocuments.beta,
            capabilityAction: capabilityActions.update,
            creator: mockData.didDocuments.beta
              .invokeCapability[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.beta
              .invokeCapability[0].publicKey[0].privateKey.privateKeyBase58
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
});

function signDocument(options, callback) {
  jsigs.sign(options.doc, {
    algorithm: 'Ed25519Signature2018',
    privateKeyBase58: options.privateKeyBase58,
    creator: options.creator
  }, (err, result) => {
    if(err) {
      return callback(err);
    }
    callback(null, result);
  });
}
