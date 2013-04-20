# Blob-Vault

A tiny REST-ful datastore for blobs using Node.js and MySQL. When storing a blob, one can (optionally)
send an ECDSA public key to protect it from being modified.


## GET /<key> 

Looks up a key and returns it, or an empty response if nothing is there.


## POST /<key>

Sets key, checking sig if it already exists and has a pub_key set.

#### blob
ascii encoded blob to store

#### sig
base64 encoded signature of sha256 hash of blob. required if a row with that key already exists and has a pub_key.

#### new_pub
base64 encoded public key to replace existing one
