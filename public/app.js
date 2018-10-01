const pusher = new Pusher('94ab7248250dc8de570e', {
    cluster: 'ap1',
    encrypted: true,
    authEndpoint: 'pusher/auth'
});

const app = new Vue({
    el: '#app',

    data: {
        joined: false,
        username: '',
        members: '',
        newMessage: '',
        messages: [],
        status: '',
        typing_users: [],
        have_typing_users: false
    },

    methods: {
        joinChat() {
            axios.post('join-chat', {username: this.username})
                .then(response => {
                    // User has joined the chat
                    this.joined = true;

                    const channel = pusher.subscribe('presence-groupChat');

                    channel.bind('pusher:subscription_succeeded', (members) => {
                        this.members = channel.members;
                    });

                    // User joins chat
                    channel.bind('pusher:member_added', (member) => {
                        this.status = `${member.id} joined the chat`;
                    });

                    // Listen for chat messages
                    this.listen();
                });
        },

        sendMessage() {
            let message = {
                username: this.username,
                message: this.newMessage
            }

            // Clear input field
            this.newMessage = '';

            axios.post('/send-message', message);
        },

        listen() {
            const channel = pusher.subscribe('presence-groupChat');

            channel.bind('message_sent', (data) => {
                this.messages.push({
                    username: data.username,
                    message: data.message
                });
            });

            channel.bind('typing', (data) => {
                this.typing_users.push({
                    username: data.username
                });
            });

            channel.bind('stop_typing', (data) => {
                this.removeTypingUser(data.username);
            });
        },

        onFocus() {
          let typing_user = {
              username: this.username,
          }

          axios.post('/typing', typing_user);
        },

        onBlur() {
          let typing_user = {
              username: this.username,
          }

          axios.post('/stop-typing', typing_user);
        },

        getTypingUsers() {
          let message_typing = '';
          let users = '';
          let total_users_typing = this.typing_users.length;
          let tobe = ' is ';
          if(this.typing_users.length == 0) {
            this.have_typing_users = false;
            message_typing = '';
          }
          else {
            if(total_users_typing > 1) {
              tobe = ' are ';
            }
            for (let [key, value] of Object.entries(this.typing_users)) {
              if(key == total_users_typing -2 ){
                users = users + value['username'] + ' and ';
              }
              else if(key == total_users_typing - 1){
                users = users + value['username'];
              }
              else {
               users = users + value['username'] + ', ';
             }
            };
             message_typing = users + tobe + ' typing ...';
          }
          return message_typing;
        },

        removeTypingUser(username) {
          for (let [key, value] of Object.entries(this.typing_users)) {
            if(value['username'] == username) {
              this.typing_users.splice(key, 1);
            }
          };
        }
    }
});
