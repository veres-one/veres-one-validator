/*!
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const {config: {constants}, util: {BedrockError}} = bedrock;
const jsigs = require('jsonld-signatures');
const helpers = require('./helpers');
const {validate} = require('bedrock-validation');
const {Ed25519Signature2020} =
  require('@digitalbazaar/ed25519-signature-2020');
const {Ed25519VerificationKey2020} =
  require('@digitalbazaar/ed25519-verification-key-2020');
const {CapabilityInvocation} = require('@digitalbazaar/zcapld');
const URL = require('url');

module.exports = async ({basisBlockHeight, ledgerNode, validatorInput}) => {
  // TODO: configuration will need to be signed
  // according to the validator config (use approvedSigners)... and also
  // require the ledgerConfiguration to include a `capabilityRoot` for now
  const result = validate(
    'veres-one-validator.ledgerConfiguration', validatorInput);
  if(!result.valid) {
    return result;
  }
  const {proof: {verificationMethod: publicKeyId}} = validatorInput;
  let computedKey;
  let key;
  try {
    computedKey = _getPublicKey(publicKeyId);
    key = await Ed25519VerificationKey2020.from(computedKey);
  } catch(e) {
    const error = new BedrockError(
      'The signing key is not properly encoded.', 'ValidationError', {
        httpStatusCode: 400,
        public: true,
        operation: validatorInput,
      }, e);
    return {valid: false, error};
  }
  const controller = {
    '@context': constants.SECURITY_CONTEXT_URL,
    id: publicKeyId,
    capabilityInvocation: publicKeyId,
  };
  const documentLoader = helpers.createDidDocumentLoader({
    basisBlockHeight, ledgerNode, ledgerConfig: validatorInput,
    operationType: validatorInput.type
  });
  const proofVerifyResult = await jsigs.verify(validatorInput, {
    documentLoader,
    purpose: new CapabilityInvocation({
      allowTargetAttenuation: true,
      expectedAction: 'write',
      controller,
      expectedTarget: [
        // the root zcap's invocationTarget.
        validatorInput.ledger,
        // the proof's attenuated invocationTarget.
        `${validatorInput.ledger}/config`
      ],
      expectedRootCapability: helpers.getExpectedRootCapability(
        {expectedTarget: validatorInput.ledger})
    }),
    suite: new Ed25519Signature2020({key}),
  });
  if(!proofVerifyResult.verified) {
    const error = new BedrockError(
      'Proof verification failed.', 'ValidationError', {
        httpStatusCode: 400,
        public: true,
        operation: validatorInput,
        proofVerifyResult
      });
    return {valid: false, error};
  }
  return {valid: true};
};

function _getPublicKey(publicKeyId) {
  const publicKeyMultibase = _getPublicKeyFromId(publicKeyId);
  return {
    id: publicKeyId,
    type: 'Ed25519VerificationKey2020',
    controller: publicKeyId.split('#')[0],
    publicKeyMultibase
  };
}

function _getPublicKeyFromId(publicKeyId) {
  const parsed = URL.parse(publicKeyId);
  // drops the # from the front
  const mbPubkey = parsed.hash.substr(1);

  return mbPubkey;
}
