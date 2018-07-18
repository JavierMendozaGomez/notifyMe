(function () {
    'use strict';
    app.factory('S3Service', S3Service);
    S3Service.$inject = ['$http', '$rootScope'];
  
    function S3Service($http) {
      var service = {};
      service.downloadFile = downloadFile;
      return service;
  
      function downloadFile(urlFile, fileName) {
        $http.get(urlFile).then((response) =>{
            console.log('EL response', response)
            let data = response.data
            console.log('EL data', data)
            let blob = new Blob([JSON.stringify(data, null, "\t")], { type: "application/json" });
            saveAs(blob, fileName)
        }, (err)=>{
            console.log('Error getting the file', urlFile)
        });
      }
    }
  })();
  