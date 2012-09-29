CREATE USER 'blobby'@'localhost' IDENTIFIED BY '57umtSMG4Fyv5ary';
GRANT USAGE ON *.* TO 'blob_vault'@'localhost' IDENTIFIED BY '57umtSMG4Fyv5ary';
GRANT ALL PRIVILEGES ON blob_vault.* TO 'blobby'@'localhost';

CREATE DATABASE blob_vault;
USE blob_vault;

CREATE TABLE blobs (
  k char(64) NOT NULL,
  v varchar(4096) NOT NULL,
  UNIQUE KEY k (k)
) ENGINE=InnoDB;