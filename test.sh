node_modules/.bin/mocha --ui tdd -R spec test/test-user-create.js \
                                          test/test-user-get.js \
                                          test/test-user-caseinsensitivity-and-uniqueness.js \
                                          test/test-blob-patch.js \
                                          test/test-signature.js \
                                          test/test-usercap.js \
                                          test/test-quota.js \
                                          test/test-normalize-reserved.js \
                                          test/test-email-change-resend.js \
                                          test/test-rename.js \
                                          test/test-guard.js \
                                          test/test-guard-requests.js \
                                          test/test-profile-details.js \
                                          test/test-2fa.js &&
node test/test-libutils.js
