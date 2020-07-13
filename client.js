//<script type='module' src='./client_app.js'></script>
import { default as clientApp } from  "./client_app.js";
console.log('v2');
function getParameterByName(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\#&]" + name + "=([^&#]*)"),
    results = regex.exec(location.hash);
  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

if(window.location.hash) {
  console.log(location.hash);
  var token = getParameterByName('access_token');

  $.ajax({
      url: "https://api.mypurecloud.de/api/v2/users/me",
      type: "GET",
      beforeSend: function(xhr){xhr.setRequestHeader('Authorization', 'bearer ' + token);},
      success: function(data) {
          console.log(data);
          document.getElementById('Prenom').innerHTML = 'Prenom : '+data['name'].split(' ')[0];
          document.getElementById('Nom').innerHTML = 'Nom : '+data['name'].split(' ')[1];
          document.getElementById('department').innerHTML = 'department : '+data['department'];
          document.getElementById('Qualification').innerHTML = 'Qualification : '+data['title'];

      }
  });
  
  location.hash=''
  clientApp.setup('', '', '');
} else {
  var queryStringData = {
      response_type : "token",
      client_id : "4d7b3393-c5ed-45de-9597-9a433cf174a5",
      redirect_uri : "https://helplineudj.github.io/"
  }

  window.location.replace("https://login.mypurecloud.de/oauth/authorize?" + jQuery.param(queryStringData));
}