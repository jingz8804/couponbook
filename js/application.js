var CLIENT_ID = '425474108915-9dr4mc0pikee1n1hr5ia0fusvrg5460o.apps.googleusercontent.com';
var SCOPES = 'https://www.googleapis.com/auth/drive.appdata';

function handleClientLoad() {
    window.setTimeout(checkAuth, 1);
    // getApplicationDataFolderMetadata();
  }

  /**
   * Check if the current user has authorized the application.
   */
  function checkAuth() {
    gapi.auth.authorize(
        {'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': true},
        handleAuthResult);
  }

  /**
   * Called when authorization server replies.
   *
   * @param {Object} authResult Authorization result.
   */
  function handleAuthResult(authResult) {
    var authButton = document.getElementById('authorizeButton');
    var filePicker = document.getElementById('filePicker');
    authButton.style.display = 'none';
    filePicker.style.display = 'none';
    if (authResult && !authResult.error) {
      // Access token has been successfully retrieved, requests can be sent to the API.
      filePicker.style.display = 'block';
      filePicker.onchange = uploadFile;
      initializeAPI();
      alert("initialized!");
      // listFilesInApplicationDataFolder();
    } else {
      // No access token could be retrieved, show the button to start the authorization flow.
      authButton.style.display = 'block';
      authButton.onclick = function() {
          gapi.auth.authorize(
              {'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': false},
              handleAuthResult);
      };
    }
  }

  function initializeAPI(){
    gapi.client.load('drive', 'v2', listFilesInApplicationDataFolder);
  }

  /**
   * Start the file upload.
   *
   * @param {Object} evt Arguments from the file selector.
   */
  function uploadFile(evt) {
     var file = evt.target.files[0];
      // insertFile(file);
      insertFile2();
  }


  function insertFile2(callback) {
    getApplicationDataFolderMetadata();

      var request = gapi.client.request({
            'path': '/drive/v2/files/',
            'method': 'POST',
            'body':{
                "title" : "test.txt",
                "description" : "lalala",
                "parents": [{'id': 'appdata'}]
            }
        });
        request.execute(function(resp) { console.log(resp); gd_updateFile(resp.id, 'appdata', "lalala", listFilesInApplicationDataFolder)});

    //   gapi.client.load('drive', 'v2', function() {
    
    // });
    // listFilesInApplicationDataFolder();
    // deleteFile('1jS3ruw4z867U17buMYmPc9_yaGQQAfU21pm9yASyaP4Q');
  }

  function getApplicationDataFolderMetadata() {
    var request = gapi.client.drive.files.get({
      'fileId': 'appdata'
    });
    request.execute(function(resp, id) {
      console.log('Id: ' + resp.id);
      console.log('Title: ' + resp.title);
      $('#folderID').html(resp.id);
    });
  }

  function gd_updateFile(fileId, folderID, text, callback) {

    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    var contentType = "text/html";
    var metadata = {'mimeType': contentType, 'parents': [{'id': folderID}]};

    var multipartRequestBody =
        delimiter +  'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter + 'Content-Type: ' + contentType + '\r\n' + '\r\n' +
        text +
        close_delim;

    if (!callback) { callback = function(file) { console.log("Update Complete ",file) }; }

    gapi.client.request({
        'path': '/upload/drive/v2/files/'+fileId,
        'method': 'PUT',
        'params': {'fileId': fileId, 'uploadType': 'multipart'},
        'headers': {'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'},
        'body': multipartRequestBody,
        callback:callback,
    });
  }

  function listFilesInApplicationDataFolder(callback) {
    var retrievePageOfFiles = function(request, result) {
      request.execute(function(resp) {
        result = result.concat(resp.items);
        var nextPageToken = resp.nextPageToken;
        if (nextPageToken) {
          request = gapi.client.drive.files.list({
            'pageToken': nextPageToken
          });
          retrievePageOfFiles(request, result);
        } else {
          if(result !== undefined && result.length > 0){
            result.forEach(function(element){
              var description = element.description
              console.log(description);
              var data = description.split(',');
              if(data.length > 1){
                appendNewRowWithData(data, element.id);
              }
            });
            $('#coupon').editableTableWidget();
            attacheEvents('coupon');
          }
        }
      });
    }
    var initialRequest = gapi.client.drive.files.list({
      'q': '\'appdata\' in parents'
    });
    retrievePageOfFiles(initialRequest, []);
  }


function deleteFile(fileId, callback) {
  var request = gapi.client.drive.files.delete({
    'fileId': fileId
  });
  request.execute(callback);
}