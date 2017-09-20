# bedrock-ledger-validator-signature-or-equihash

[![Build Status](https://ci.digitalbazaar.com/buildStatus/icon?job=bedrock-ledger-validator-signature)](https://ci.digitalbazaar.com/job/bedrock-ledger-validator-signature-or-equihash)

A validator for [bedrock-ledger-node] that determines if M of N
digital signatures on a document OR an Equihash proof satisfies the
requirements defined in the ledger's configuration.

## The Validator API
- validateConfiguration(validatorConfig, callback(err))
- validateEvent(signedDocument, validatorConfig, callback(err))
- mustValidateEvent(signedDocument, validatorConfig, callback(err, result))

## Configuration
For documentation on configuration, see [config.js](./lib/config.js).

## Usage Example
```javascript
const brValidator = require('bedrock-ledger-validator-signature-or-equihash');

const validatorConfig = {
  type: 'SignatureOrEquihashValidator2017',
  eventFilter: [{
    type: 'EventTypeFilter',
    eventType: ['WebLedgerEvent']
  }],
  approvedSigner: [
    'did:v1:53ebca61-5687-4558-b90a-03167e4c2838'
    'did:v1:be0d2a4a-583f-4a8b-98c8-73bdf046bfd1/keys/1'
  ],
  minimumSignaturesRequired: 1,
  equihashParameterN: 64,
  equihashParameterK: 3
};

const signedDocumentOne = {
  "@context": "https://w3id.org/webledger/v1",
  "type": "WebLedgerEvent",
  "operation": "Create",
  "input": [
    {
      "@context": "https://w3id.org/test/v1",
      "id": "https://example.com/events/dd5090e9-13f0-48d1-89a3-af9ffb092fcf",
      "type": "Concert",
      "name": "Big Band Concert in New York City",
      "startDate": "2017-07-14T21:30",
      "location": "https://example.org/the-venue",
      "offers": {
        "type": "Offer",
        "price": "13.00",
        "priceCurrency": "USD",
        "url": "https://example.com/purchase/309433"
      }
    }
  ],
  "signature": {
    "type": "LinkedDataSignature2015",
    "created": "2017-07-10T14:10:24Z",
    "creator": "did:v1:be0d2a4a-583f-4a8b-98c8-73bdf046bfd1/keys/1",
    "signatureValue": "IyEQBDNGEMt0YMpVQgrn...HF9FZpyDlFw=="
  }
}

const signedDocumentTwo = {
  "@context": "https://w3id.org/webledger/v1",
  "type": "WebLedgerEvent",
  "operation": "Create",
  "input": [
    {
      "@context": "https://w3id.org/test/v1",
      "id": "https://example.com/events/dd5090e9-13f0-48d1-89a3-af9ffb092fcf",
      "type": "Concert",
      "name": "Big Band Concert in New York City",
      "startDate": "2017-07-14T21:30",
      "location": "https://example.org/the-venue",
      "offers": {
        "type": "Offer",
        "price": "13.00",
        "priceCurrency": "USD",
        "url": "https://example.com/purchase/309433"
      }
    }
  ],
  "signature": {
    "type": "EquihashSignature2017",
    "equihashParameterN": 64,
    "equihashParameterK": 3,
    "nonce": 3,
    "signatureValue": "EMt0YVQgrnMIyEQBDNGp...DlFwHF9FZpy=="
  }
}

// when ledgers are created, or configuration changes are made, consensus
// algorithms should validate the validator configuration using the
// `validateConfiguration` API
brValidator.validateConfiguration(validatorConfig, err => {
  if(err) {
    throw new Error('An error occurred when validating the configuration: ' + err.message);
  }
  console.log('SUCCESS: The configuration was validated.');
});

// consensus algorithms use the `mustValidateEvent` API to determine if this
// validator is designed to operate on a particular event
brValidator.mustValidateEvent(signedDocumentOne, validatorConfig, (err, result) => {
  if(err) {
    throw new Error('An error occurred: ' + err.message);
  }
  if(!result) {
    console.log('The `validateEvent` API should NOT be used for this event.');
  }
  console.log('The `validateEvent` API should be used for this event.');
});

// if the `mustValidateEvent` API returns true, then consensus algorithms should
// call the `validateEvent` API for the event
brValidator.validateEvent(signedDocumentTwo, validatorConfig, err => {
  if(err) {
    throw new Error('An error occurred when validating the document: ' + err.message);
  }
  console.log('SUCCESS: The document was validated.');
});
```

[bedrock-ledger-node]: https://github.com/digitalbazaar/bedrock-ledger-node
