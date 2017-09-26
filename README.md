# veres-one-validator

[![Build Status](https://ci.digitalbazaar.com/buildStatus/icon?job=veres-one-validator)](https://ci.digitalbazaar.com/job/veres-one-validator)

A validator for [bedrock-ledger-node] that determines if M of N
digital signatures on a document, an Equihash proof, or any combination
thereof satisfies the requirements.

## The Validator API
- validateConfiguration(validatorConfig, callback(err))
- validateEvent(signedDocument, validatorConfig, callback(err))
- mustValidateEvent(signedDocument, validatorConfig, callback(err, result))

## Configuration
For documentation on configuration, see [config.js](./lib/config.js).

## Usage Example
```javascript
const brValidator = require('veres-one-validator');

const validatorConfig = {
  type: 'VeresOneValidator2017',
  eventFilter: [{
    type: 'EventTypeFilter',
    eventType: ['WebLedgerEvent']
  }]
};

const signedDocument = {};

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
brValidator.mustValidateEvent(signedDocument, validatorConfig, (err, result) => {
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
brValidator.validateEvent(signedDocument, validatorConfig, err => {
  if(err) {
    throw new Error('An error occurred when validating the document: ' + err.message);
  }
  console.log('SUCCESS: The document was validated.');
});
```

[bedrock-ledger-node]: https://github.com/digitalbazaar/bedrock-ledger-node
