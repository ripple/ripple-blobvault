'use strict';

exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table("attestations", function(table) {
      table.dropColumn('signed_jwt_base64');
      table.dropColumn('blinded_signed_jwt_base64');   
    })
  ]);   
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table("attestations", function(table) {
      table.string('signed_jwt_base64', 10000);
      table.string('blinded_signed_jwt_base64', 10000);
    })
  ]);  
};
