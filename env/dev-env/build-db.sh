#!/bin/bash -e

echo "Setting up DB (blobvault) in docker environment..."
echo "with the following sql dump in (./):"
echo "---"

cat /srv/ripple/blobvault/dbsetup.sql

echo "---"

mysql -u root -h $DB_1_PORT_3306_TCP_ADDR -P $DB_1_PORT_3306_TCP_PORT blobvault < /srv/ripple/blobvault/dbsetup.sql

echo "finished loading schema"
echo "schema currently loaded:"
echo "---"
mysqldump -u root -h $DB_1_PORT_3306_TCP_ADDR -P $DB_1_PORT_3306_TCP_PORT --no-data blobvault
