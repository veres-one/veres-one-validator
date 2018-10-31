/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const _ = require('lodash');
const bedrock = require('bedrock');
const {constants} = bedrock.config;
const brLedgerNode = require('bedrock-ledger-node');
const brLedgerUtils = require('bedrock-ledger-utils');
const jsigs = require('jsonld-signatures')();
const jsonpatch = require('fast-json-patch');
const equihashSigs = require('equihash-signature');
const {promisify} = require('util');
const validate = promisify(require('bedrock-validation').validate);
const {BedrockError} = bedrock.util;
require('bedrock-ledger-context');
require('bedrock-veres-one-context');
const {VeresOneDidDoc} = require('did-veres-one');

require('./config');
const cfg = bedrock.config['veres-one-validator'];

const api = {};
module.exports = api;

let cryptonymDidRegex;

bedrock.events.on('bedrock.start', () => {
  jsigs.use('jsonld', bedrock.jsonld);
  equihashSigs.install(jsigs);

  brLedgerNode.use('VeresOneValidator2017', {api, type: 'validator'});

  if(cfg.environment === 'live') {
    cryptonymDidRegex = /^did\:v1\:nym\:.*/;
  } else {
    cryptonymDidRegex = /^did\:v1\:test\:nym\:.*/;
  }
});

api.mustValidate = async ({validatorConfig, validatorInput}) => {
  await api.validateConfiguration({validatorConfig});
  if(validatorConfig.validatorFilter &&
    !validatorConfig.validatorFilter.some(f =>
      f.type === 'ValidatorFilterByType' &&
      f.validatorFilterByType.includes(validatorInput.type))) {
    return false;
  }
  return true;
};

api.validateConfiguration = async ({validatorConfig}) => {
  return validate('veres-one-validator.config', validatorConfig);
};

api.validate = async (
  {ledgerConfig = {}, ledgerNode, validatorInput}) => {
  if(!ledgerNode) {
    throw new TypeError('"ledgerNode" must be a LedgerNode instance.');
  }

  // TODO: this validator also needs to handle and input with
  // a type of `WebLedgerConfiguration`... which will need to be signed
  // according to the validator config (use approvedSigners)... and also
  // require the ledgerConfiguration to include a `capabilityRoot` for now
  await validate('veres-one-validator.operation', validatorInput);
  await _validateProofs({ledgerNode, validatorInput});

  const electorPool = _.get(ledgerConfig, 'electorSelectionMethod.electorPool');

  if(validatorInput.type === 'CreateWebLedgerRecord') {
    return _validateCreateOperation({electorPool, validatorInput, ledgerNode});
  }
  // must be an UpdateWebLedgerRecord op
  return _validateUpdateOperation({electorPool, ledgerNode, validatorInput});
};

async function _validateCreateOperation(
  {electorPool, validatorInput, ledgerNode}) {

  await _validateDid(validatorInput);

  let err;
  try {
    await ledgerNode.records.get({recordId: validatorInput.record.id});
  } catch(e) {
    err = e;
  }
  if(!err) {
    throw new BedrockError(
      'Duplicate DID Document.', 'DuplicateError', {
        httpStatusCode: 400,
        public: true,
        operation: validatorInput
      });
  }
  // if state machine does not have DID and it is to be created (i.e.
  // the record matches the DID), use it as the DID Document
  if(err.name !== 'NotFoundError') {
    throw err;
  }

  // validate a new electorPool document
  if(electorPool && electorPool === validatorInput.record.id) {
    const {electorPool} = validatorInput.record;
    await _validateElectorPoolElectors({electorPool, ledgerNode});
  }
}

async function _validateElectorPoolElectors({electorPool, ledgerNode}) {
  const {id: ledgerNodeId} = ledgerNode;
  try {
    await brLedgerUtils.dereferenceElectorPool({electorPool, ledgerNode});
  } catch(e) {
    throw new BedrockError(
      'An error occurred while dereferencing elector pool electors.',
      e.name, {electorPool, ledgerNodeId}, e);
  }
  // success
}

async function _validateUpdateOperation(
  {electorPool, validatorInput, ledgerNode}) {
  const {recordPatch} = validatorInput;
  const record = await ledgerNode.records.get({recordId: recordPatch.target});
  const {sequence} = recordPatch;
  const {sequence: expectedSequence = 0} = record.meta;
  if(sequence !== expectedSequence) {
    throw new BedrockError(
      'The given sequence number does not match the current DID ' +
      'Document record.',
      'ValidationError', {
        httpStatusCode: 409,
        public: true,
        sequence,
        expectedSequence
      });
  }
  const {patch} = recordPatch;
  const {record: didDocument} = record;
  const errors = jsonpatch.validate(patch, didDocument);
  if(errors) {
    throw new BedrockError(
      'The given JSON patch is invalid.', 'ValidationError', {
        httpStatusCode: 400,
        public: true,
        patch,
        errors
      });
  }

  // apply patch and compact
  const patched = jsonpatch.applyPatch(didDocument, patch).newDocument;

  // FIXME: can we do better than testing for particular properties?
  // could there be a `record.type`?
  if(patched.electorPool) {
    // electorPool document
    await validate('veres-one-validator.electorPoolDocument', patched);
  } else {
    // didDocument
    await validate('veres-one-validator.didDocument', patched);
  }

  // validate a patched electorPool document
  if(electorPool && electorPool === patched.id) {
    const {electorPool} = patched;
    await _validateElectorPoolElectors({electorPool, ledgerNode});
  }
}

// FIXME: support remove operation
// async function _validateRemoveOperation(input) {}

async function _validateDid(input) {
  const didDocument = new VeresOneDidDoc({doc: input.record});

  try {
    await didDocument.validateDid({env: cfg.environment});
  } catch(cause) {
    throw new BedrockError(
      `Error validating DID: ${cause.message}`, 'ValidationError', {
        httpStatusCode: 400,
        public: true,
        cause
      });
  }
}

async function _validateProofs({ledgerNode, validatorInput}) {
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
  if(!_checkProofCombination(validatorInput.proof)) {
    throw new BedrockError(
      'Insufficient proof provided on operation.',
      'NotAllowedError', {
        httpStatusCode: 400,
        public: true,
        operation: validatorInput
      });
  }

  let record;
  if(validatorInput.type === 'CreateWebLedgerRecord') {
    record = validatorInput.record;
  }

  // verify all proofs, if any fail, reject the operation, even if not relevant
  await jsigs.verify(validatorInput, {
    documentLoader: _createDidDocumentLoader(
      ledgerNode, record, bedrock.jsonld),
    // must allow for old operations to pass validation
    checkTimestamp: false
  });

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

function _createDidDocumentLoader(ledgerNode, record, jsonld) {
  // delimiters for a DID URL
  const splitRegex = /[;|\/|\?|#]/;
  const oldDocumentLoader = jsonld.documentLoader;
  return async function(url) {
    if(!url.startsWith('did:')) {
      return oldDocumentLoader(url);
    }
    const [did] = url.split(splitRegex);
    // try to get DID from state machine
    let err;
    let result;
    try {
      result = await ledgerNode.records.get({recordId: did});
    } catch(e) {
      err = e;
    }
    let didDocument;
    if(err) {
      // if state machine does not have DID and it is to be created (i.e.
      // the record matches the DID), use it as the DID Document

      // FIXME: is this fix correct, the previous implementation was broken

      if(err.name === 'NotFoundError' && record && record.id === did) {
        didDocument = record;
      } else {
        throw err;
      }
    }
    if(!didDocument) {
      didDocument = result.object;
    }
    if(!url.includes('#')) {
      return {
        contextUrl: null,
        document: didDocument,
        documentUrl: url
      };
    }
    // try to find the specific object in the DID document
    const document = await _pluckDidNode(did, url, didDocument, jsonld);
    return {
      contextUrl: null,
      document,
      documentUrl: url
    };
  };
}

async function _pluckDidNode(did, target, didDocument, jsonld) {
  // flatten to isolate target
  const flattened = await jsonld.flatten(didDocument);
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
    const err = new Error('Not Found');
    err.httpStatusCode = 404;
    err.status = 404;
    throw err;
  }

  // frame target
  const framed = await jsonld.frame(
    filtered, {'@context': constants.VERES_ONE_CONTEXT_URL, id: target},
    {embed: '@always'});

  return Object.assign(
    {'@context': constants.VERES_ONE_CONTEXT_URL},
    framed['@graph'][0]);
}
