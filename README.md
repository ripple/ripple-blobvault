# Ripple Blobvault

User management for Ripple wallets.

See [API Reference](http://docs.blobvaultv1.apiary.io/) for details on how to use the API.

## Environments

### Development

* Use [fig](http://orchardup.github.io/fig/) and [docker](https://www.docker.io/). They
  will download the base boxes and run the chef   recipes to set up your development
  environment. Use `fig ps` to find port mappings from the container to your local
  machine. Docker caches the results of build steps so unless you're editing chef
  recipes or the recipes change, you should only need to run them once.

* The development database machine is not exposed to the outside world but may be exposed
  by editing the appropriate configuration line in fig.yml. Think carefully before doing this
  the default password for the root account is blank. This database is *not* meant to be exposed.

* In order to set up the database or to refresh the schema execute

  ```bash
  fig run blobvault ./env/dev-env/build-db.sh
  ```

Note that this will drop and clear any tables in the current database.

### Production

* Use chef cookbooks at env/chef/cookbooks to configure and deploy the blobvault application
* Cookbooks use test kitchen to check compatibility. The development environment is emulated by
  the ubuntu-12.04 environment.
