module.exports = {
  WebhookMetadata: function (type, url, repo, branch, commit) {
    this.type = type;
    this.url = url;
    this.repo = repo;
    this.branch = branch;
    this.commit = commit;
  }
}