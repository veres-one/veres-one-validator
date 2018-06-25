/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const constants = bedrock.config.constants;
const brLedgerNode = require('bedrock-ledger-node');
const didv1 = require('did-veres-one');
const jsigs = require('jsonld-signatures')();
const jsonpatch = require('fast-json-patch');
const equihashSigs = require('equihash-signature');
const validate = require('bedrock-validation').validate;
const BedrockError = bedrock.util.BedrockError;
require('veres-one-context');

require('./config');
const cfg = bedrock.config['veres-one-validator'];

let cryptonymDidRegex;

bedrock.events.on('bedrock.start', () => {
  jsigs.use('jsonld', bedrock.jsonld);
  equihashSigs.install(jsigs);

  brLedgerNode.use('VeresOneValidator2017', {
    type: 'validator',
    api: api
  });

  if(cfg.environment === 'live') {
    cryptonymDidRegex = /^did\:v1\:nym\:.*/;
  } else {
    cryptonymDidRegex = /^did\:v1\:test\:nym\:.*/;
  }
});

const api = {};
module.exports = api;

api.mustValidate = (input, validatorConfig, options, callback) => {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  api.validateConfiguration(validatorConfig, err => {
    if(err) {
      return callback(err);
    }
    if(validatorConfig.validatorFilter &&
      !validatorConfig.validatorFilter.some(f =>
        f.type === 'ValidatorFilterByType' &&
        f.validatorFilterByType.includes(input.type))) {
      return callback(null, false);
    }
    callback(null, true);
  });
};

api.validateConfiguration = (validatorConfig, options, callback) => {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  validate('veres-one-validator.config', validatorConfig, callback);
};

api.validate = (input, validatorConfig, options, callback) => {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  const {ledgerNode = null} = options;
  if(!ledgerNode) {
    return callback(new TypeError(
      '"options.ledgerNode" must be a LedgerNode instance.'));
  }

  // TODO: this validator also needs to handle and input with
  // a type of `WebLedgerConfiguration`... which will need to be signed
  // according to the validator config (use approvedSigners)... and also
  // require the ledgerConfiguration to include a `capabilityRoot` for now

  async.auto({
    compact: callback => {
      bedrock.jsonld.compact(input, {
        '@context': constants.VERES_ONE_CONTEXT_URL
      }, (err, compacted) => {
        if(err) {
          return callback(err);
        }
        input = compacted;
        callback();
      });
    },
    operationSchema: ['compact', (results, callback) => {
      validate('veres-one-validator.operation', input, callback);
    }],
    proofs: ['operationSchema', (results, callback) =>
      _validateProofs(input, ledgerNode, callback)],
    validateOperation: ['proofs', (results, callback) => {
      if(input.type === 'CreateWebLedgerRecord') {
        return _validateCreateOperation({input, ledgerNode}, callback);
      }
      // must be an UpdateWebLedgerRecord op
      _validateUpdateOperation({input, ledgerNode}, callback);
    }]
  }, err => callback(err));
};

function _validateCreateOperation({input, ledgerNode}, callback) {
  async.auto({
    nymCheck: callback => {
      // if DID is not a cryptonym, skip this check
      const didDocument = input.record;
      const did = didDocument.id;
      if(!_isCryptonymDid(did)) {
        return callback();
      }
      _validateCryptonymDid(didDocument, callback);
    },
    record: ['nymCheck', (results, callback) => ledgerNode.stateMachine.get(
      input.record.id, {}, err => {
        if(!err) {
          return callback(new BedrockError(
            'Duplicate DID Document.', 'DuplicateError', {
              httpStatusCode: 400,
              public: true,
              operation: input
            }));
        }
        // if state machine does not have DID and it is to be created (i.e.
        // the record matches the DID), use it as the DID Document
        if(err.name !== 'NotFoundError') {
          return callback(err);
        }
        callback();
      })],
  }, callback);
}

function _validateUpdateOperation({input, ledgerNode}, callback) {
  const {recordPatch} = input;
  async.auto({
    record: callback => ledgerNode.stateMachine.get(
      recordPatch.target, {}, callback),
    sequence: ['record', (results, callback) => {
      const {sequence} = recordPatch;
      const {sequence: expectedSequence = 0} = results.record.meta;
      if(sequence !== expectedSequence) {
        return callback(new BedrockError(
          'The given sequence number does not match the current DID ' +
          'Document record.',
          'ValidationError', {
            httpStatusCode: 409,
            public: true,
            sequence,
            expectedSequence
          }));
      }
      callback();
    }],
    apply: ['sequence', (results, callback) => {
      const {patch} = input.recordPatch;
      const errors = jsonpatch.validate(patch, results.didDocument);
      if(errors) {
        return callback(new BedrockError(
          'The given JSON patch is invalid.', 'ValidationError', {
            httpStatusCode: 400,
            public: true,
            patch,
            errors
          }));
      }

      // apply patch and compact
      const patched = jsonpatch.applyPatch(
        results.record.object, patch).newDocument;
      bedrock.jsonld.compact(
        patched, constants.VERES_ONE_CONTEXT_URL,
        (err, compacted) => callback(err, compacted));
    }],
    validate: ['apply', (results, callback) => {
      const patched = results.apply;
      validate('veres-one-validator.didDocument', patched, callback);
    }]
  }, callback);
}

// FIXME: support remove operation
//function _validateRemoveOperation(input, callback) {
//}

function _validateCryptonymDid(didDocument, callback) {
  // FIXME: make above schema handle this check automatically in `nym` case
  if(!didDocument.authentication) {
    return callback(new BedrockError(
      '"authentication" must be present to register cryptonym DID ' +
      'Documents.', 'ValidationError', {
        httpStatusCode: 400,
        public: true,
        didDocument
      }));
  }

  // FIXME: enforce a single authentication key to start, so there is no
  // ambiguity over which key to use to generate the cryptonym... OR
  // check each authentication key for a match
  const key = didDocument.authentication[0].publicKey[0];

  // support `publicKeyPem` or `publicKeyBase58` authentication key
  // formats to produce cryptonyms
  let did;
  if('publicKeyPem' in key &&
    bedrock.jsonld.hasValue(key, 'type', 'RsaVerificationKey2018')) {
    did = didv1.createCryptonymDid({
      publicKey: key.publicKeyPem,
      encoding: 'pem',
      env: cfg.environment
    });
  } else if('publicKeyBase58' in key &&
    bedrock.jsonld.hasValue(key, 'type', 'Ed25519VerificationKey2018')) {
    did = didv1.createCryptonymDid({
      publicKey: key.publicKeyBase58,
      encoding: 'base58',
      env: cfg.environment
    });
  } else {
    // FIXME: make above schema handle this check
    return callback(new BedrockError(
      'Cryptonym DIDs can only be created from an "RsaVerificationKey2018" ' +
      'key with a "publicKeyPem" encoding or an "Ed25519VerificationKey2018" ' +
      'key with a "publicKeyBase58" encoding.', 'ValidationError', {
        httpStatusCode: 400,
        public: true,
        publicKey: key
      }));
  }

  if(didDocument.id !== did) {
    return callback(new BedrockError(
      'The DID does not match the cryptonym generated from a public key ' +
      'referenced in "authentication" application suite in the DID Document.',
      'ValidationError', {
        httpStatusCode: 400,
        public: true,
        didDocument
      }));
  }

  callback();
}

function _validateProofs(input, ledgerNode, callback) {
  /* Proofs enable:

    1. The authorization of the request:
      a. A capability proof for `AuthorizeRequest` capabilityAction, i.e.
      an entity's submitted ledger operation will only be authorized if the
      entity has been given a capability invocation from an accelerator that
      authorized it.

      OR...

      b. A proof of work (EquihashProof2018), i.e. an entity's submitted
      ledger operation will only be authorized if they have expended enough
      resources to prevent a Sybil attack.

    AND...

    2. A capability proof for the `RegisterDid` or `UpdateDidDocument`
    capabilityAction, i.e. an entity can only create/patch a particular
    DidDocument if they have been delegated the capability to do so.

    Pseudo code explaining this:

    if(hasPow(proof)) {
      authorizeRequest();
    } else if(proof.authorizeRequest) {
      authorizeRequest();
    } else {
      throw Error('Not authorized');
    }

    if(proof.registerDid) {
      registerDid();
    } else if(proof.updateDidDocument) {
      updateDidDocument();
    }
  */

  // ensure a valid proof combination has been given
  if(!_checkProofCombination(input.proof)) {
    return callback(new BedrockError(
      'Insufficient proof provided on operation.',
      'PermissionDenied', {
        httpStatusCode: 400,
        public: true,
        operation: input
      }));
  }

  let record;
  if(input.type === 'CreateWebLedgerRecord') {
    record = input.record;
  }

  // verify all proofs, if any fail, reject the operation, even if not relevant
  jsigs.verify(input, {
    documentLoader: _createDidDocumentLoader(
      ledgerNode, record, bedrock.jsonld),
    // must allow for old operations to pass validation
    checkTimestamp: false
  }, callback);

  // FIXME: Need to check to see if `invocationTarget` is specified ... and if
  // so, it needs to be the same as the DID capability document OR, the
  // delegator of the capability needs to be the `capabilityRoot` in the
  // latest config for the ledger
}

function _checkProofCombination(proofs) {
  // valid combinations:
  // 1. EquihashProof2018,
  //    (Rsa/Ed25519 + RegisterDid/UpdateDidDocument)
  // 2. (Rsa/Ed25519 + AuthorizeRequest),
  //    (Rsa/Ed25519 + RegisterDid/UpdateDidDocument)

  const hasRegisterDidOcap =
    _hasOcapInvocationProof(proofs, 'RsaSignature2018', 'RegisterDid') ||
    _hasOcapInvocationProof(proofs, 'Ed25519Signature2018', 'RegisterDid');

  const hasUpdateDidDocumentOcap =
    _hasOcapInvocationProof(proofs, 'RsaSignature2018', 'UpdateDidDocument') ||
    _hasOcapInvocationProof(
      proofs, 'Ed25519Signature2018', 'UpdateDidDocument');

  if(_hasProofType(proofs, 'EquihashProof2018') &&
    (hasRegisterDidOcap || hasUpdateDidDocumentOcap)) {
    return true;
  }

  const hasAuthorizeRequestOcap =
    _hasOcapInvocationProof(proofs, 'RsaSignature2018', 'AuthorizeRequest') ||
    _hasOcapInvocationProof(proofs, 'Ed25519Signature2018', 'AuthorizeRequest');

  if(hasAuthorizeRequestOcap &&
    (hasRegisterDidOcap || hasUpdateDidDocumentOcap)) {
    return true;
  }

  return false;
}

function _hasProofType(proofs, type) {
  return proofs.some(proof => proof.type === type);
}

function _hasOcapInvocationProof(proofs, type, action) {
  return proofs.some(proof =>
    proof.type === type &&
    proof.proofPurpose === 'capabilityInvocation' &&
    proof.capabilityAction === action);
}

function _isCryptonymDid(did) {
  return cryptonymDidRegex.test(did);
}

function _createDidDocumentLoader(ledgerNode, record, jsonld) {
  // delimiters for a DID URL
  const splitRegex = /[;|\/|\?|#]/;
  const oldDocumentLoader = jsonld.documentLoader;
  return function(url, callback) {
    if(!url.startsWith('did:')) {
      return oldDocumentLoader(url, callback);
    }
    const [did] = url.split(splitRegex);
    // try to get DID from state machine
    ledgerNode.stateMachine.get(did, {}, (err, result) => {
      let didDocument;
      if(err) {
        // if state machine does not have DID and it is to be created (i.e.
        // the record matches the DID), use it as the DID Document
        if(err.name === 'NotFoundError' && record && record.id === did) {
          didDocument = record;
        }
        return callback(err);
      }
      if(!didDocument) {
        didDocument = result.object;
      }
      if(!url.includes('#')) {
        return callback(null, {
          contextUrl: null,
          document: didDocument,
          documentUrl: url
        });
      }
      // try to find the specific object in the DID document
      _pluckDidNode(did, url, didDocument, jsonld, (err, result) => {
        if(err) {
          return callback(err);
        }
        callback(null, {
          contextUrl: null,
          document: result,
          documentUrl: url
        });
      });
    });
  };
}

function _pluckDidNode(did, target, didDocument, jsonld, callback) {
  // flatten to isolate target
  jsonld.flatten(didDocument, (err, flattened) => {
    if(err) {
      return callback(err);
    }

    // filter out non-DID nodes and find target
    let found = false;
    const filtered = [];
    for(const node of flattened) {
      const id = node['@id'];
      if(id !== did) {
        filtered.push(node);
        if(id === target) {
          found = true;
        }
      }
    }

    // target not found
    if(!found) {
      err = new Error('Not Found');
      err.httpStatusCode = 404;
      err.status = 404;
      return callback(err);
    }

    // frame target
    jsonld.frame(
      filtered, {'@context': constants.VERES_ONE_CONTEXT_URL, id: target},
      {embed: '@always'}, (err, framed) => {
        if(err) {
          return callback(err);
        }
        const doc = Object.assign(
          {'@context': constants.VERES_ONE_CONTEXT_URL},
          framed['@graph'][0]);
        callback(null, doc);
      });
  });
}
