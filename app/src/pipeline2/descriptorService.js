var request = require('request')

module.exports = {

  fetchRemoteDistroDescriptors : function (servers, callback) {

    var responseArray = [];

    var serversAsArray = Object.keys(servers)
    var errors = [];

    function downloader (index, error) {
      if( index < serversAsArray.length ) {

        var url = servers[serversAsArray[index]].descriptor.url

        request.get(url, function (error, response, body) {
          var successful = response.statusCode == 200 || response.statusCode == 301 || response.statusCode == 302

          var item = {}
          item.id = serversAsArray[index]
          if (error || !successful ) {
            console.error('Error encountered while downloading ' + url)
            console.error('Error: ' + error)
            console.error('Response status code: ' + response.statusCode)
            console.error('Body: ' + body)
            item.error = response.statusCode 
            errors.push(item)
          }
          if (!error && successful ) {
            item.descriptor = body
            item.type = servers[serversAsArray[index]].descriptor.type
            responseArray.push(item)
          }
          downloader(index + 1, errors)
        });
      } else {
        callback(errors, responseArray)
      }
    }
    downloader(0)
  }
}