/*!
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const bs58 = require('bs58');
const {config: {constants}, util: {BedrockError}} = bedrock;
const jsigs = require('jsonld-signatures');
const multicodec = require('multicodec');
const multibase = require('multibase');
const {validate} = require('bedrock-validation');
const {Ed25519KeyPair} = require('crypto-ld');
const {Ed25519Signature2018} = jsigs.suites;
const {AssertionProofPurpose} = jsigs.purposes;
const URL = require('url');

/* eslint-disable-next-line no-unused-vars */
module.exports = async ({ledgerNode, validatorInput}) => {
  // TODO: configuration will need to be signed
  // according to the validator config (use approvedSigners)... and also
  // require the ledgerConfiguration to include a `capabilityRoot` for now
  const result = validate(
    'veres-one-validator.ledgerConfiguration', validatorInput);
  if(!result.valid) {
    return result;
  }
  // FIXME: for testnet_v2, the genesis configuration has a
  // AssertionProofPurpose
  const {proof: {verificationMethod: publicKeyId}} = validatorInput;
  const controller = {
    '@context': constants.SECURITY_CONTEXT_URL,
    id: publicKeyId,
    assertionMethod: publicKeyId,
  };
  const key = new Ed25519KeyPair(await _getPublicKey(publicKeyId));
  const proofVerifyResult = await jsigs.verify(validatorInput, {
    documentLoader: bedrock.jsonld.documentLoader,
    purpose: new AssertionProofPurpose({controller}),
    suite: new Ed25519Signature2018({key}),
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

async function _getPublicKey(publicKeyId) {
  const publicKeyBase58 = _getPublicKeyFromId({publicKeyId});
  return {
    id: publicKeyId,
    type: 'Ed25519VerificationKey2018',
    controller: publicKeyId,
    publicKey: publicKeyId,
    publicKeyBase58
  };
}

function _getPublicKeyFromId({publicKeyId}) {
  const parsed = URL.parse(publicKeyId);
  // drops the # from the front
  const mbPubkey = parsed.hash.substr(1);
  const mcPubkeyBytes = multibase.decode(mbPubkey);
  const mcType = multicodec.getCodec(mcPubkeyBytes);
  if(mcType !== 'ed25519-pub') {
    throw new BedrockError(
      'Key ID is not a multiformats encoded ed25519 public key.',
      'EncodingError', {publicKeyId});
  }
  const pubkeyBytes = multicodec.rmPrefix(mcPubkeyBytes);
  // now that prefix is removed, re-encode to base58
  const b58Pubkey = bs58.encode(pubkeyBytes);
  return b58Pubkey;
}
