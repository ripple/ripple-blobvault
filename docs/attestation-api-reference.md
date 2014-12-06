## Attestation API Reference
Creating an attestation is a multiple step process that is different depending on user's country of origin.  The first step is the same for all users, collecting and attempting to validate basic profile information.  In the US, this can be done for organizations as well as individuals.  Right now, organizations have no second step for verification.  For people in the US, and Canada, the second step of verification is to answer knowledge based questions.  For everyone else, the second step requires a webcam photo and an upload of a photo ID.  The process of verifying this info requires some time, so the user's status will be pending until customer support confirms the verificaton.

### Attestation JWT 
Attestations come in the form of JSON web tokens (JWT) consisting of a header, payload, and signature.  The payload can contain identification of the user, personal identity info, and attestation claims about the user.

+ header
    + typ (string) ... 'JWT'
    + alg (string) ... 'RS256'
    + kid (string) ... key id for verifiying the signature
+ payload
    + iss (string) ... issuer 
    + sub (string) ... subject - identity_id from blob
    + exp (int) ... expiration (unix timestamp)
    + iat (int) ... issued at (unix timestamp)
    + profile_verified (boolean) ... profile verification status
    + identity_verified (boolean) ... identity verification status
    + .... (additional claims, PII)
+ signature (string) ... base64 encoded signature


#### GET  /v1/attestation (HMAC signed request)
Get a user's attestation

+ Parameters:
    + signature (required, string) ... the HMAC signature
    + signature_blob_id (required, string) ... the blob id
    + signature_date (required, string) ... the date string

+ **Response 201 (application/json)**
    + result (string) ... query result (success, error)
    + status (string) ... attestation status ('incomplete', 'verified', 'unverified')
    + attestation (string) ... signed JWT attestation, including PII
    + blinded (string) ... signed JWT attestation, excluding PII   

#### POST /v1/attestation (HMAC signed request)
Create or update an attestation

+ Parameters:
    + signature (required, string) ... the HMAC signature
    + signature_blob_id (required, string) ... the blob id
    + signature_date (required, string) ... the date string
      
+ **Request (application/json)** (HMAC signed request)
    + type (string) ... "person", "organization"
    + profile (JSON) ... profile details to be attested
    + 'person' profile:    
        + profile.name (JSON) ... name object
        + profile.name.given (string) ... given, or first name
        + profile.name.family (string) ... family, or last name
        + profile.name.middle (string, optional) ... middle name
        + profile.birth_day (string) ... day of birth
        + profile.birth_month (string) ... month of birth
        + profile.birth_year (string) ... year of birth
        + profile.birth_place (string, optional) ... location of birth
        + profile.id_document (JSON) ... identification document object
        + profile.id_document.type (string) ... type of document (ssn, passport, drivers_license etc)
        + profile.id_document.value (string) ... document number or value
        + profile.id_document.country (string, optional) ... ISO country issuing document
        + profile.id_dcoument.region (string, optional) ... region/province/state issuing document
        + profile.address (JSON) ... address object
        + profile.address.line1 (string) ... first address line
        + profile.address.line2 (string, optional) ... second address line
        + profile.address.locality (string) ... city/locality
        + profile.address.region (string) ... region/state/province
        + profile.address.postal_code (string) ... postal/zip code
        + profile.address.country (string) ... ISO country code
    + 'organization' profile:    
        + profile.name (string) ... name of organization
        + profile.aliases (string) ... comma separated list of alternate names
        + profile.tax_id (string) ... 9 digit tax_id
        + profile.incorporated (JSON) ... incorporation info
        + profile.incorporated.country (string) ... country of incorporation
        + profile.incorporated.region (string) ... region/state of incorporation
        + profile.incorporated.type (string) ... type of incorporation
        + profile.incorporated.date (JSON) ... date of incorporation
        + profile.incorporated.date.day (string) ... day of incorporation
        + profile.incorporated.date.month (string) ... month of incorporation
        + profile.incorporated.date.year (string, optional) ... year of incorporation
        + profile.address (JSON) ... address object
        + profile.address.line1 (string) ... first address line
        + profile.address.line2 (string, optional) ... second address line
        + profile.address.locality (string) ... city/locality
        + profile.address.region (string) ... region/state/province
        + profile.address.postal_code (string) ... postal/zip code
        + profile.address.country (string) ... ISO country code
    + answers (array) ... answers to knowledge based questions
        + answers[0].question_id (int) ... question identifier
        + answers[0].answer_id (int) ... answer identifier
        + answers[1].question_id (int) ... question identifier
        + answers[1].answer_id (int) ... answer identifier
        + ....
    + photo (base64) ... photo of user for matching
    + photo_id (base64) .... photo/scan of photo identification
+ **Response 201 (application/json)**
    + result (string) ... query result (success, error)
    + status (string) ... attestation status ('incomplete', 'verified', 'unverified')
    + questions (array) ... questions set
        + questions[0].id (int) ... question identifier
        + questions[0].question (string) ... question text
        + questions[0].answers(array) ... answers set
        + questions[0].answers[0].id (int) ... answer identifier
        + questions[0].answers[0].answer (string) ... answer text    
        + ....
    + requirements (array) ... additional requirements to complete attestation (one or more of 'profile', 'answers', 'photo','photo_id') 
    + attestation (string) ... signed JWT attestation, including PII
    + blinded (string) ... signed JWT attestation, excluding PII      
    
