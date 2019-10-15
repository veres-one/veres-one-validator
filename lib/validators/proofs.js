/*!
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const {util: {BedrockError}} = bedrock;
const helpers = require('./helpers');
const jsigs = require('jsonld-signatures');
const {CapabilityInvocation} = require('ocapld');

// TODO: in testnet v2, the `AuthorizeRequest` proof on the operation
// is only validated using json-schema. For v3, use jsigs.verify to properly
// validate the signature
module.exports = async ({basisBlockHeight, ledgerNode, validatorInput}) => {
  // select the required `capabilityAction` based on the operation type
  let capabilityAction;
  let expectedTarget;
  const {record, recordPatch} = validatorInput;

  switch(validatorInput.type) {
    case 'CreateWebLedgerRecord':
      capabilityAction = 'create';
      ({id: expectedTarget} = record);
      break;
    case 'UpdateWebLedgerRecord':
      capabilityAction = 'update';
      ({target: expectedTarget} = recordPatch);
      break;
    default:
      // extra insurance, schema validation should prevent this possibility
      const error = new BedrockError(
        'Unknown opereration type.', 'ValidationError', {
          httpStatusCode: 400,
          public: true,
          operation: validatorInput,
        });
      return {valid: false, error};
  }

  const {suites: {Ed25519Signature2018}} = jsigs;
  const documentLoader = helpers.createDidDocumentLoader(
    {basisBlockHeight, ledgerNode, record});
  const result = await jsigs.verify(validatorInput, {
    documentLoader,
    compactProof: false,
    purpose: new CapabilityInvocation({
      capabilityAction,
      // controller: record,
      expectedTarget
    }),
    suite: new Ed25519Signature2018(),
  });

  if(!result.verified) {
    const error = new BedrockError(
      'Proof verification failed.', 'ValidationError', {
        httpStatusCode: 400,
        public: true,
        operation: validatorInput,
        proofVerifyResult: result
      });
    return {valid: false, error};
  }
  // success
  return {valid: true};
};
