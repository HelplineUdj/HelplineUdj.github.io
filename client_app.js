/* 
*   NOTE: This sample uses ES6.
*/
console.log('Client App was called');
let clientApp = {};

// PureCloud OAuth information
const platformClient = require('platformClient');
const client = platformClient.ApiClient.instance;
const redirectUri = "https://helplineudj.github.io/";

// API instances
const usersApi = new platformClient.UsersApi();
const notificationsApi = new platformClient.NotificationsApi();
const analyticsApi = new platformClient.AnalyticsApi();
const routingApi = new platformClient.RoutingApi();

// Will Authenticate through PureCloud and subscribe to User Conversation Notifications
clientApp.setup = function(pcEnv, langTag, html){
    let clientId = '4d7b3393-c5ed-45de-9597-9a433cf174a5';
    clientApp.langTag = langTag;

    // Authenticate via PureCloud
    client.setPersistSettings(true);
    // client.setDebugLog(console.log, 25);
    client.setEnvironment("mypurecloud.de");
    client.loginImplicitGrant(clientId, redirectUri, { state: "state" })
    .then(data => {        
        // Get Details of current User and save to Client App
        return usersApi.getUsersMe();
    }).then( userMe => {
        clientApp.userId = userMe.id;
         document.getElementById('Prenom').innerHTML = 'Prenom : '+userMe['name'].split(' ')[0];
          document.getElementById('Nom').innerHTML = 'Nom : '+userMe['name'].split(' ')[1];
          document.getElementById('department').innerHTML = 'Department : '+userMe['department'];
          document.getElementById('Qualification').innerHTML = 'Qualification : '+userMe['title'];
        // Create a Notifications Channel
        return notificationsApi.postNotificationsChannels();
    }).then(data => {
        clientApp.websocketUri = data.connectUri;
        clientApp.channelID = data.id;
        clientApp.socket = new WebSocket(clientApp.websocketUri);
        clientApp.socket.onmessage = clientApp.onSocketMessage;
        clientApp.topicIdAgent = "v2.users." + clientApp.userId + ".conversations.calls";

        // Subscribe to Call Conversations of Current user.
        let topic = [{"id": clientApp.topicIdAgent}];
        return notificationsApi.postNotificationsChannelSubscriptions(clientApp.channelID, topic);
    }).then(
        $.getJSON('./language.json', function(data) {
            clientApp.language = data;
        })
    ).then(data => console.log("Succesfully set-up Client App. : "+ Object.values(data)))

    // Error Handling
    .catch(e => console.log(e));
};

// Handler for every Websocket message
clientApp.onSocketMessage = function(event){
    console.log('EVENT: ');
    console.log(event);
    let data = JSON.parse(event.data);
    let topic = data.topicName;
    let eventBody = data.eventBody;
/*    console.log('DATA: ');
    console.table(data);
    
    console.log('TOPIC: ');
    console.table(topic);
    console.log('EVENTBODY: ');
    console.table(eventBody);
    console.log(topic +" , "+ clientApp.topicIdAgent)*/
    // If a voice interaction (from queue) comes in
    if(topic === clientApp.topicIdAgent){
        clientApp.subscribeToQueue(data.eventBody.participants[0].queue.id)
        let caller = eventBody.participants.filter(participant => participant.purpose === "customer")[0];
        let agent = eventBody.participants.filter(participant => participant.purpose === "agent")[0];
        // Put values to the fields
        if((caller.endTime !== undefined) && (!clientApp.isCallActive)){
            $("#callerName").text("");
            $("#callerNumber").text("");
            $("#callerArea").text("");

            clientApp.isCallActive = false;
        } else if(agent.state === "alerting") {
            let callerLocation = '';

            $("#callerName").text(caller.name);
            $("#callerNumber").text(caller.address);

            client.getLocalInfo(caller.address,{
                military: false,
                zone_display: 'area'
                }, object => {
                    $("#callerArea").text(object.time.display +' '+ object.location);
                    callerLocation = object.location;
                }
            );
            
            // S'assure que le champ ne change que la première fois. 
            clientApp.isCallActive = true;
            
            clientApp.toastIncomingCall(callerLocation);
        } else {
            /*clientApp.onSocketMessageQueue(event);*/
            clientApp.isCallActive = false;
        }
    }
};

clientApp.toastIncomingCall = function(callerLocation){
    if(clientApp.hasOwnProperty('purecloudClientApi')){
        if(clientApp.langTag !== null) {
            clientApp.purecloudClientApi.alerting.showToastPopup(clientApp.language[clientApp.langTag].IncomingCall, clientApp.language[clientApp.langTag].From + ": " + callerLocation);
        } else {
            clientApp.purecloudClientApi.alerting.showToastPopup(clientApp.language["en-us"].IncomingCall, clientApp.language["en-us"].From + ": " + callerLocation);
        }        
    }
};

clientApp.loadSupervisorView = function(){
    // Get all Queues
    var body = { pageSize : 300 };

    routingApi.getRoutingQueues(body)
    .then(data => {
        let queues = data.entities;

        let dropdown = $('#ddlQueues');
        dropdown.empty();
        dropdown.append('<option selected="true" disabled">Queues</option>');
        dropdown.prop('selectedIndex', 0);

        for (var i = 1; i < queues.length; i++) {
            dropdown.append($('<option></option>').attr('value', queues[i].id).text(queues[i].name));
        }
    });
};

clientApp.subscribeToQueue = function(queue){
    // Check if there is an active conversation
    clientApp.getActiveConversation(queue);

    // Subscribe to Conversations of selected queue.
    clientApp.socket.onmessage = clientApp.onSocketMessageQueue;
    clientApp.topicIdSup = "v2.routing.queues." + queue + ".conversations";

    let topic = [{"id": clientApp.topicIdSup}];
    notificationsApi.postNotificationsChannelSubscriptions(clientApp.channelID, topic);
};

clientApp.getActiveConversation = function(queue){
    var startDt = new Date();
    startDt.setHours(0,0,0,0);
    startDt.toUTCString();
    var endDt = new Date(startDt + 1);
    endDt.setHours(24,0,0,0);
    endDt.toUTCString();

    var body = 
        {
            interval: startDt.toJSON() + "/" + endDt.toJSON(),
            order: "asc",
            orderBy: "conversationStart",
            paging: {
                pageSize: 25,
                pageNumber: 1
            },
            segmentFilters: [
                {
                    type: "and",
                    predicates: [
                        {
                            type: "dimension",
                            dimension: "queueId",
                            operator: "matches",
                            value: queue
                        }
                    ]
                }
            ],
            conversationFilters: [
                {
                    type: "or",
                    predicates: [
                        {
                            type: "dimension",
                            dimension: "conversationEnd",
                            operator: "notExists",
                            value: null
                        }
                    ]
                }
            ]
        };

    analyticsApi.postAnalyticsConversationsDetailsQuery(body)
    .then(data => {
        if(Object.keys(data).length > 0) {
            (data.conversations).forEach(function(conversation) {
                let caller = conversation.participants.filter(participant => participant.purpose === "external")[0];            
                let acd = conversation.participants.filter(participant => participant.purpose === "acd")[0];
                let acdSegment = acd.sessions[0].segments.filter(segment => segment.segmentType === "interact")[0];
                let agent = conversation.participants.filter(participant => participant.purpose === "agent")[0];

                if(caller === null) {
                    caller = conversation.participants.filter(participant => participant.purpose === "customer")[0];
                }

                // Get values to insert in table
                var id = conversation.conversationId;
                var name = caller.participantName;
                var type;
                var ani;
                var dnis;
                var state;
                var wait;
                var duration;
                
                if(caller.sessions[0].mediaType === "voice") {
                    type = "Call";
                    ani = caller.sessions[0].ani;
                    dnis = caller.sessions[0].dnis;                    
                } else if(caller.sessions[0].mediaType === "chat") {
                    type = "Chat";
                    ani = caller.sessions[0].roomId;
                    dnis = caller.sessions[0].roomId;
                } else if(caller.sessions[1].mediaType === "callback") {
                    type = "Callback";
                    ani = caller.sessions[0].ani;
                    dnis = caller.sessions[0].dnis;
                } else if(caller.sessions[1].mediaType === "email") {
                    type = "Email";
                    ani = caller.sessions[0].addressSelf;
                    dnis = caller.sessions[0].addressFrom;
                }

                if(agent !== undefined) {
                    // If active call
                    state = "connected";
                    wait = new Date(new Date(acdSegment.segmentEnd) - (new Date(acdSegment.segmentStart))).toISOString().slice(11, -1);

                    clientApp.insertRow(id, type, name, ani, dnis, state, wait, duration);
                    clientApp.startDurationTimer(id, new Date(acdSegment.segmentStart));
                } else {
                    // Caller on queue
                    state = "on queue";

                    clientApp.insertRow(id, type, name, ani, dnis, state, wait, duration);
                    clientApp.startDurationTimer(id, new Date(acdSegment.segmentStart));
                    clientApp.startWaitTimer(id, new Date(acdSegment.segmentStart));
                }
            });            
        }
    }).catch(e => console.log("ERROR CALLING API: " + e + "|| REQUEST BODY: " + JSON.stringify(body)));
};

// Handler for every Websocket message
clientApp.onSocketMessageQueue = function(event){
    let data = JSON.parse(event.data);
    let topic = data.topicName;
    console.log('flozac7vvuyaaav')
    // If an interaction (from queue) comes in
    
    if(topic === clientApp.topicIdSup){    
        // Check to see if Conversation details is already displayed in the view
        if ($('#tblCallerDetails td:contains(' + data.eventBody.id + ')').length) {
            console.log('updateTableRow')
            clientApp.updateTableRow(data);            
        } else {
            console.log('addTableRow')
            clientApp.addTableRow(data);
        }
    }
};

clientApp.addTableRow = function(data) {
    let caller = data.eventBody.participants.filter(participant => participant.purpose === "customer")[0];    
    let agent = data.eventBody.participants.filter(participant => participant.purpose === "agent")[0];    
    let acd = data.eventBody.participants.filter(participant => participant.purpose === "acd")[0];
    console.log('caller: ');
    console.log(caller);
    console.log('agent: ');
    console.log(agent);
    console.log('acd: ');
    console.log(acd);
    // Call Conversation Type
    if((caller.calls !== undefined) && (caller.chats === undefined) && (caller.callbacks === undefined) && (caller.emails === undefined)) {
        console.log('caller.calls !== undefined')
        if ((agent === undefined) && (acd.calls[0].state === "connected")) {
            console.log('caller.calls !== undefined 222222222')
            // Call on queue
            clientApp.insertRow(data.eventBody.id, "Call", caller.name, caller.address, caller.calls[0].other.addressNormalized, "on queue");            
            clientApp.startDurationTimer(data.eventBody.id, new Date(acd.connectedTime));
            clientApp.startWaitTimer(data.eventBody.id, new Date(acd.connectedTime));
            clientApp.isCallActiveSup = false;
        } else if((acd.endTime !== undefined) && (!clientApp.isCallActiveSup) && (agent !== undefined)){
            // If incoming call
            clientApp.insertRow(data.eventBody.id, "Call", caller.name, caller.address, caller.calls[0].other.addressNormalized, agent.calls[0].state);            
            clientApp.startDurationTimer(data.eventBody.id, new Date(acd.connectedTime));
            clientApp.startWaitTimer(data.eventBody.id, new Date(acd.connectedTime));
            clientApp.isCallActiveSup = true;
        }
    }    

    // Chat Conversation Type
    if((caller.calls === undefined) && (caller.chats !== undefined) && (caller.callbacks === undefined) && (caller.emails === undefined)) {
        if ((agent === undefined) && (acd.chats[0].state === "connected")) {
            // Chat on queue
            clientApp.insertRow(data.eventBody.id, "Chat", caller.name, caller.address, caller.chats[0].roomId, "on queue");            
            clientApp.startDurationTimer(data.eventBody.id, new Date(acd.connectedTime));
            clientApp.startWaitTimer(data.eventBody.id, new Date(acd.connectedTime));
            clientApp.isCallActiveSup = false;
        } else if((acd.endTime === undefined) && (!clientApp.isCallActiveSup) && (agent !== undefined)){
            // If incoming chat
            clientApp.insertRow(data.eventBody.id, "Chat", caller.name, caller.address, caller.chats[0].roomId, agent.calls[0].state);            
            clientApp.startDurationTimer(data.eventBody.id, new Date(acd.connectedTime));
            clientApp.startWaitTimer(data.eventBody.id, new Date(acd.connectedTime));
            clientApp.isCallActiveSup = true;
        }
    }

    // Callback Conversation Type
    if((caller.calls !== undefined) && (caller.chats === undefined) && (caller.callbacks !== undefined) && (caller.emails === undefined)) {
        if ((agent === undefined) && (acd.callbacks[0].state === "connected")) {
            // Callback on queue
            clientApp.insertRow(data.eventBody.id, "Callback", caller.name, caller.address, caller.calls[0].other.addressNormalized, "on queue");            
            clientApp.startDurationTimer(data.eventBody.id, new Date(acd.connectedTime));
            clientApp.startWaitTimer(data.eventBody.id, new Date(acd.connectedTime));
            clientApp.isCallActiveSup = false;
        } else if((acd.endTime === undefined) && (!clientApp.isCallActiveSup) && (agent !== undefined)){
            // If incoming callback
            clientApp.insertRow(data.eventBody.id, "Callback", caller.name, caller.address, caller.calls[0].other.addressNormalized, agent.callbacks[0].state);            
            clientApp.startDurationTimer(data.eventBody.id, new Date(acd.connectedTime));
            clientApp.startWaitTimer(data.eventBody.id, new Date(acd.connectedTime));
            clientApp.isCallActiveSup = true;
        }
    }

    // Email Conversation Type
    if((caller.calls === undefined) && (caller.chats === undefined) && (caller.callbacks === undefined) && (caller.emails !== undefined)) {
        if ((agent === undefined) && (acd.emails[0].state === "connected")) {
            // Email on queue
            clientApp.insertRow(data.eventBody.id, "Email", caller.name, caller.address, acd.address, "on queue");            
            clientApp.startDurationTimer(data.eventBody.id, new Date(acd.connectedTime));
            clientApp.startWaitTimer(data.eventBody.id, new Date(acd.connectedTime));
            clientApp.isCallActiveSup = false;
        } else if((acd.endTime === undefined) && (!clientApp.isCallActiveSup) && (agent !== undefined)){
            // If incoming email
            clientApp.insertRow(data.eventBody.id, "Email", caller.name, caller.address, acd.address, agent.emails[0].state);            
            clientApp.startDurationTimer(data.eventBody.id, new Date(acd.connectedTime));
            clientApp.startWaitTimer(data.eventBody.id, new Date(acd.connectedTime));
            clientApp.isCallActiveSup = true;
        }
    }
};

clientApp.updateTableRow = function(data) {
    let caller = data.eventBody.participants.filter(participant => participant.purpose === "customer")[0];
    let agent = data.eventBody.participants.filter(participant => participant.purpose === "agent")[0];    
    let acd = data.eventBody.participants.filter(participant => participant.purpose === "acd")[0];

    // Call Conversation Type
    if((caller.calls !== undefined) && (caller.chats === undefined) && (caller.callbacks === undefined) && (caller.emails === undefined)) {
        if((acd.endTime !== undefined) && (caller.endTime === undefined) && (agent !== undefined)) {
            // If active call
            var wait = new Date((new Date(acd.connectedTime)) - (new Date(caller.connectedTime))).toISOString().slice(11, -1);
            clientApp.updateRow(data, agent.calls[0].state, wait, $("#Duration" + data.eventBody.id).text());
            clientApp.stopWaitTimer(data.eventBody.id);
            clientApp.isCallActiveSup = true;
        } else if(agent !== undefined) {
            // If disconnected call
            if (agent.calls[0].state === "disconnected") {                
                var wait = new Date((new Date(acd.connectedTime)) - (new Date(caller.connectedTime))).toISOString().slice(11, -1);
                var duration = new Date((new Date(caller.endTime)) - (new Date(caller.connectedTime))).toISOString().slice(11, -1);
                clientApp.updateRow(data, agent.calls[0].state, wait, duration);
                clientApp.isCallActiveSup = false;
            }        
        }else {
            clientApp.updateRow(data, agent.calls[0].state, $("#Wait" + data.eventBody.id).text(), $("#Duration" + data.eventBody.id).text());
            clientApp.isCallActiveSup = false;
        }
    }
    
    // Chat Conversation Type
    if((caller.calls === undefined) && (caller.chats !== undefined) && (caller.callbacks === undefined) && (caller.emails === undefined)) {
        if((acd.endTime === undefined) && (!clientApp.isCallActiveSup) && (agent !== undefined)){
            // If incoming chat
            clientApp.updateRow(data, agent.chats[0].state, $("#Wait" + data.eventBody.id).text(), $("#Duration" + data.eventBody.id).text());
            clientApp.isCallActiveSup = false;
        } else if((acd.endTime !== undefined) && (caller.endTime === undefined) && (agent !== undefined)) {
            // If active chat
            var wait = new Date((new Date(acd.connectedTime)) - (new Date(caller.connectedTime))).toISOString().slice(11, -1);
            clientApp.updateRow(data, agent.chats[0].state, wait, $("#Duration" + data.eventBody.id).text());
            clientApp.stopWaitTimer(data.eventBody.id);
            clientApp.isCallActiveSup = true;
        } else if(agent !== undefined) {
            // If disconnected chat
            if (agent.chats[0].state === "disconnected") {                
                var wait = new Date((new Date(acd.connectedTime)) - (new Date(caller.connectedTime))).toISOString().slice(11, -1);
                var duration = new Date((new Date(caller.endTime)) - (new Date(caller.connectedTime))).toISOString().slice(11, -1);
                clientApp.updateRow(data, agent.chats[0].state, wait, duration);
                clientApp.isCallActiveSup = false;
            }        
        }
    }

    // Callback Conversation Type
    if((caller.calls !== undefined) && (caller.chats === undefined) && (caller.callbacks !== undefined) && (caller.emails === undefined)) {
        if((acd.endTime === undefined) && (!clientApp.isCallActiveSup) && (agent !== undefined)){
            // If incoming callback
            clientApp.updateRow(data, agent.callbacks[0].state, $("#Wait" + data.eventBody.id).text(), $("#Duration" + data.eventBody.id).text());
            clientApp.isCallActiveSup = false;
        } else if((acd.endTime !== undefined) && (caller.endTime === undefined) && (agent !== undefined)) {
            // If active callback
            var wait = new Date((new Date(acd.connectedTime)) - (new Date(caller.connectedTime))).toISOString().slice(11, -1);
            clientApp.updateRow(data, agent.callbacks[0].state, wait, $("#Duration" + data.eventBody.id).text());
            clientApp.stopWaitTimer(data.eventBody.id);
            clientApp.isCallActiveSup = true;
        } else if(agent !== undefined) {
            // If disconnected callback
            if (agent.callbacks[0].state === "disconnected") {                
                var wait = new Date((new Date(acd.connectedTime)) - (new Date(caller.connectedTime))).toISOString().slice(11, -1);
                var duration = new Date((new Date(caller.endTime)) - (new Date(caller.connectedTime))).toISOString().slice(11, -1);
                clientApp.updateRow(data, agent.callbacks[0].state, wait, duration);
                clientApp.isCallActiveSup = false;
            }        
        }
    }

    // Email Conversation Type
    if((caller.calls === undefined) && (caller.chats === undefined) && (caller.callbacks === undefined) && (caller.emails !== undefined)) {
        if((acd.endTime === undefined) && (!clientApp.isCallActiveSup) && (agent !== undefined)){
            // If incoming email
            clientApp.updateRow(data, agent.emails[0].state, $("#Wait" + data.eventBody.id).text(), $("#Duration" + data.eventBody.id).text());
            clientApp.isCallActiveSup = false;
        } else if((acd.endTime !== undefined) && (caller.endTime === undefined) && (agent !== undefined)) {
            // If active email
            var wait = new Date((new Date(acd.connectedTime)) - (new Date(caller.connectedTime))).toISOString().slice(11, -1);
            clientApp.updateRow(data, agent.emails[0].state, wait, $("#Duration" + data.eventBody.id).text());
            clientApp.stopWaitTimer(data.eventBody.id);
            clientApp.isCallActiveSup = true;
        } else if(agent !== undefined) {
            // If disconnected email
            if (agent.emails[0].state === "disconnected") {                
                var wait = new Date((new Date(acd.connectedTime)) - (new Date(caller.connectedTime))).toISOString().slice(11, -1);
                var duration = new Date((new Date(caller.endTime)) - (new Date(caller.connectedTime))).toISOString().slice(11, -1);
                clientApp.updateRow(data, agent.emails[0].state, wait, duration);
                clientApp.isCallActiveSup = false;
            }        
        }
    }
};

clientApp.startDurationTimer = function(id, acdConnectedDt) {
    // Set timer for duration
    var intervalId1 = setInterval(function() {  
        var currentDate = new Date();
        $("#Duration" + id).text(new Date(currentDate - acdConnectedDt).toISOString().slice(11, -1).split('.')[0]); 
    }, 1000);   
    $("#Duration" + id).attr("wait-timer-id",intervalId1);
}

clientApp.startWaitTimer = function(id, acdConnectedDt) {
    // Set timer for wait time
    var intervalId = setInterval(function() {   
        var currentDate = new Date();
        $("#Wait" + id).text(new Date(currentDate - acdConnectedDt).toISOString().slice(11, -1).split('.')[0]); 
    }, 1000);   
    $("#Wait" + id).attr("wait-timer-id",intervalId);
}

clientApp.stopWaitTimer = function(id) {
    // Stop wait timer
    window.clearInterval($("#Wait" + id).attr("wait-timer-id"));
}

clientApp.insertRow = function(id, type, name, ani, dnis, state, wait, duration) {
     console.log('flozac77 insertRow')
    // Create table row
    var tableRef = document.getElementById('tblCallerDetails').getElementsByTagName('tbody')[0];
    var newRow = tableRef.insertRow(tableRef.rows.length);
    
    // Create Cell columns
    var idCell = newRow.insertCell(0);
    var typeCell = newRow.insertCell(1);
    var nameCell = newRow.insertCell(2);
    var aniCell = newRow.insertCell(3);
    var dnisCell = newRow.insertCell(4);
    var stateCell = newRow.insertCell(5);
    var waitCell = newRow.insertCell(6);
    var durationCell = newRow.insertCell(7);

    // Create text nodes
    var idText = document.createTextNode(id);
    var typeText = document.createTextNode(type);
    var nameText = document.createTextNode(name);
    var aniText = document.createTextNode(ani);
    var dnisText = document.createTextNode(dnis);
    var stateText = document.createTextNode(state);
    var waitText = document.createTextNode(wait);
    var durationText = document.createTextNode(duration);

    // Append text nodes to cell columns
    idCell.appendChild(idText);
    typeCell.appendChild(typeText);
    nameCell.appendChild(nameText);
    aniCell.appendChild(aniText);
    dnisCell.appendChild(dnisText);
    stateCell.appendChild(stateText);
    waitCell.appendChild(waitText);
    durationCell.appendChild(durationText);

    // CSS styles
    idCell.style.padding = "5px";
    typeCell.style.padding = "5px";
    nameCell.style.padding = "5px";
    aniCell.style.padding = "5px";
    dnisCell.style.padding = "5px";
    stateCell.style.padding = "5px";
    waitCell.style.padding = "5px";
    durationCell.style.padding = "5px";

    // Make sure Conversation ID column is always hidden
    idCell.hidden = true;

    // Create element ID for timers
    waitCell.setAttribute("id", "Wait" + id);
    durationCell.setAttribute("id", "Duration" + id);
};

clientApp.updateRow = function(data, state, wait, duration) {
    $('#tblCallerDetails > tbody> tr').each(function() {
        var firstTd = $(this).find('td:first');
        if ($(firstTd).text() == data.eventBody.id) {
            if(state === "disconnected") {
                // Stop duration timer
                window.clearInterval($("#Duration" + data.eventBody.id).attr("wait-timer-id"));

                // Remove row from table
                var thisRow = $(this);
                thisRow.remove();
            } else {
                $(this).find('td:eq(5)').text(state);
                $(this).find('td:eq(6)').text(wait);
                $(this).find('td:eq(7)').text(duration);
            }
            
        }
    })
};

export default clientApp;
