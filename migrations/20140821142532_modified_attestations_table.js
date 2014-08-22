'use strict';

exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table("attestations", function(table) {
      table.dropColumn('binary');
      table.dropColumn('attestation');
      table.dropColumn('meta');
      
      table.string('identity_id');
      table.string('issuer');
      table.string('status');
      table.json('payload');
      table.string('signed_jwt_base64', 10000);
      table.string('blinded_signed_jwt_base64', 10000);
      table.bigInteger('created');
    })
  ]); 
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table("attestations", function(table) {
      table.binary('binary');
      table.json('attestation');
      table.json('meta');
      
      table.dropColumn('identity_id');
      table.dropColumn('issuer');
      table.dropColumn('status');
      table.dropColumn('payload');
      table.dropColumn('signed_jwt_base64');
      table.dropColumn('blinded_signed_jwt_base64');
      table.dropColumn('created');      
    })
  ]);   
};
