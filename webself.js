
  window._genesys = {
    widgets: {

	  console: {open: true},
		
	  main: {
		theme: 'dark',
		themes: {

			dark: 'cx-theme-dark',
			light: 'cx-theme-light',
			helpline: 'cx-theme-helpline'
		},
		preload: ['webchat'],
		lang: 'fr',
		debug: true
	  },
  
      webchat: {
		  
		chatButton: {
		  enabled: true, // (boolean) Enable/disable chat button on screen.
		  template: '<div>Live\nChat</div>', // (string) Custom HTML string template for chat button.
		  effect: 'fade',         // (string) Type of animation effect when revealing chat button. 'slide' or 'fade'.
		  openDelay: 1000,        // (number) Number of milliseconds before displaying chat button on screen.
		  effectDuration: 300,    // (number) Length of animation effect in milliseconds.
		  hideDuringInvite: true  // (boolean) When auto-invite feature is activated, hide the chat button. When invite is dismissed, reveal the chat button again.
        },
    
		form: {
			wrapper: "<table></table>",
			inputs: [
				{
					id: 'cx_webchat_form_email',
					name: 'email',
					maxlength: '100',
					placeholder: 'Required',
					label: 'Email'
				}
			]
		},

        transport: {
          type: 'purecloud-v2-sockets',
          dataURL: 'https://api.mypurecloud.de',
          deploymentKey: '2330d14c-38f1-4a63-9a18-585627934f2f',
          orgGuid: 'e98a239a-156b-46ca-a036-3615d8df2a9b',
          interactionData: {
            routing: {
              targetType: 'QUEUE',
              targetAddress: '0100-UDJ SD - Chats',
              priority: 2
            }
          }
        }
      }
    }
  };

const customPlugin = CXBus.registerPlugin('Custom');

  customPlugin.subscribe('WebChatService.started', function (e) {
    console.log('Chat started', e);
  });

  customPlugin.subscribe('WebChatService.ended', function (e) {
    console.log('Chat ended', e);
  });

