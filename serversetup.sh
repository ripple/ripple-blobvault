sudo apt-get install mysql-server
# mysqld should be running on port 3306

sudo apt-get install node
sudo apt-get install npm
npm install mysql@2.0.0-alpha3
npm install express@3.0.0rc4

mkdir ~/code
cd code
git clone https://github.com/jedmccaleb/Blob-Vault.git
# enter user name and password
cd Blob-Vault

mysql -u root -p PASSWORD < dbsetup.sql

node server.js
