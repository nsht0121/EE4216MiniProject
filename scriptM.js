const endpoint = "http://ee4216mp24-env.eba-vfe8vpjm.us-east-1.elasticbeanstalk.com/api";

$( document ).ready( () => {
  $( '.ui.dropdown' ).dropdown();
});

Vue.component('app-note', {
  props: [ 'data' ],
  template: `
    <div class="note" @click="$emit( 'on-note-edit', data.id )">
      <div class="badge" v-bind:style="{ borderRightColor: data.color }"></div>
      <span class="title">{{ data.title }}</span>
      <span class="date">{{ data.date }}</span>
      <p>{{ data.content }}</p>
    </div>
  `,
});

Vue.component('app-edit-form', {
  props: [ 'data' ],
  template: `
    <div id="note-editor" class="ui fullscreen modal">
      <i class="close icon"></i>
      <div class="header">{{ data.header }}</div>

      <div class="content">
        <form id="form-note" class="ui form">
          <div class="field">
            <label for="input-title">Title</label>
            <input type="text" id="input-title" name="title" placeholder="Title">
          </div>
          <div class="field">
            <label for="input-content">Content</label>
            <textarea rows="8" id="input-content" name="content" placeholder="Write Something..."></textarea>
          </div>
          <div class="field">
            <label>Color</label>
            <input type="color" id="input-color" name="color">
          </div>
        </form>
      </div>

      <div class="actions">
        <div v-if="data.delete" class="ui red deny button">Delete</div>
        <div class="ui cancel button">{{ data.cancel }}</div>
        <div class="ui positive button">{{ data.accept }}</div>
      </div>
    </div>
  `,
})

var app = new Vue({
  el: '#app',
  data() {
    return {
      localID: 0,
      currentUser: null,
      isSignIn: false,
      editorMode: 'create',
      form: {
        create: {
          header: 'Create Note',
          accept: 'Save',
          cancel: 'Discard',
          delete: false,
        },
        edit: {
          header: 'Edit Note',
          accept: 'Update',
          cancel: 'Cancel',
          delete: true,
        }
      },
      noteList: [
        // { id: 0, title: 'Title A', content: 'Content A', color: '#4DE73B', date: new Date(Date.now()).toGMTString() },
      ],
      activeFontSize: {
        small: false,
        default: true,
        large: false,
      },
      activeSorter: {
        id: { asc: false, desc: false },
        title: { asc: false, desc: false },
        date: { asc: false, desc: false },
      },
      myFontSizeValue: {
        small: "12px",
        default: "14px",
        large: "16px",
      },
      id: 0,
    }
  },
  created: function() {
    var size = this.checkFontSize();
    this.changeFontResizer( size );
    this.getNotesByUsername( this.currentUser );
  },
  methods: {
    checkFontSize: function() {
      const size = this.readCookie( "myFontSize" );
      switch ( size ) {
        case "small":
          return "small";
        case "default":
          return "default";
        case "large":
          return "large";
        default:
          this.createCookie( "myFontSize", "default", 365 );
          return "default";
      }
    },
    changeFontResizer: function( size ) {
      this.createCookie( "myFontSize", size, 365 );
      switch ( size ) {
        case "small":
          this.activeFontSize = {
            small: true,
            default: false,
            large: false,
          };
          $( '#pageStyle' ).text( "html { font-size: 12px; }" );
          break;
        case "large":
          this.activeFontSize = {
            small: false,
            default: false,
            large: true,
          };
          $( '#pageStyle' ).text( "html { font-size: 16px; }" );
          this.myFontSize = "large";
          break;
        default:
          this.activeFontSize = {
            small: false,
            default: true,
            large: false,
          };
          $( '#pageStyle' ).text( "html { font-size: 14px; }" );
          this.myFontSize = "default";
          break;
      }
    },
    readCookie: ( name ) => {
      var pairs = document.cookie.split( ";" );
      var key = name + "=";
      var value = "";
      for ( var i = 0; i < pairs.length; i++ ) {
        if (pairs[ i ].trim().substring( 0, name.length + 1 ).match( key )) {
          value = pairs[ i ].trim().substring( name.length + 1 );
          break;
        }
      }
      return value;
    },
    createCookie: ( name, value, days = 7 ) => {
      var date = new Date();
      date.setTime( date.getTime() + days * 86400000 );
      document.cookie = `${name}=${value}; expires=${date.toGMTString()}; path=/`;
    },
    onSearch: () => {
      console.log( "searching..." );
    },
    onNoteCreate: function() {
      this.editorMode = 'create';
      $( '#input-color' ).val( "#" + Math.floor( Math.random() * 16777215 ).toString( 16 ) );
      $( '#note-editor' ).modal({
        duration: 200,
        onApprove: () => {
          // create 'Note' object
          var data = $( '#form-note' ).serializeArray().reduce( (obj, item) => {
            obj[ item.name ] = item.value;
            return obj;
          }, {});
          data['title'] = data['title'] || "No Title";
          data['date'] = new Date( Date.now() ).toLocaleString();

          // post to server
          if ( !this.currentUser ) {
            data['id'] = `local-${this.localID++}`
            this.noteList.push( data );
            return;
          };

          data['username'] = this.currentUser;
          axios.post( "/api/notes/create", Qs.stringify( data ) )
          .then( res => {
            $('body').toast({
              position: 'top center',
              class: 'info',
              message: res.data,
            });
            this.getNotesByUsername( this.currentUser );
          })
          .catch( e => {
            console.log(e);
            $('body').toast({
              class: 'error',
              message: 'Create note failed. An error occured!'
            });
          });

          // clear input value
          $( '#input-title' ).val( '' );
          $( '#input-content' ).val( '' );
        },
        onHidden: () => {
          // clear input value
          $( '#input-title' ).val( '' );
          $( '#input-content' ).val( '' );
        },
      }).modal( 'show' );
    },
    onNoteEdit: function( id ) {
      this.editorMode = 'edit';

      // find note by id
      var note = this.noteList.find( n => { return n.id === id } );
      if ( note ) {
        $( '#input-title' ).val( note.title );
        $( '#input-content' ).val( note.content );
        $( '#input-color' ).val( note.color );
      }

      // show modal
      $( '#note-editor' ).modal({
        onApprove: () => {
          // local edit
          $( '#form-note' ).serializeArray().reduce( ( obj, item ) => {
            note[ item.name ] = item.value;
            return obj;
          }, {});
          note['title'] = note['title'] || "No Title";
          note['date'] = new Date( Date.now() ).toLocaleString();
          if ( !this.currentUser ) { return; }

          // DB edit
          axios.post( '/api/notes/edit', Qs.stringify( note ) )
          .then( res => {
            $('body').toast({
              position: 'top center',
              class: 'info',
              message: res.data,
            });
          })
          .catch( e => {
            console.log(e);
            $('body').toast({
              class: 'error',
              message: 'Edit note failed. An error occured!'
            });
          });
        },
        onDeny: ( el ) => {
          if ( el.hasClass( 'deny' ) ) {
            // Local Remove
            this.noteList = this.noteList.filter( n => n.id !== id );
            if ( !this.currentUser ) return;

            // DB Remove
            axios.post(
              "/api/notes/delete",
              `id=${id}`,
              { headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' } }
            )
            .then( res => {
              $('body').toast({
                position: 'top center',
                class: 'info',
                message: res.data,
              });
            })
            .catch( e => {
              console.log( e );
              $('body').toast({
                position: 'top center',
                class: 'error',
                message: 'Delete Failed. An error occured!',
              });
            })
          } else {
            $( '#input-title' ).val( '' );
            $( '#input-content' ).val( '' );
          }
        },
        onHidden: () => {
          $( '#input-title' ).val( '' );
          $( '#input-content' ).val( '' );
        },
      }).modal( 'show' );
    },
    onSort: function( key ) {
      const sortAsc = this.activeSorter[ key ].asc;
      if ( sortAsc ) { // Sort desc
        this.noteList.sort( function ( a, b ) {
          return ( typeof( a[ key ] ) == 'number' ) ? b[ key ] - a[ key ] : b[ key ].localeCompare( a[ key ] );
        });
      } else { // Sort asc
        this.noteList.sort( function( a, b ) {
          return ( typeof( a[ key ] ) == 'number' ) ? a[ key ] - b[ key ] : a[ key ].localeCompare( b[ key ] );
        });
      }
      this.activeSorter = this.defaultClass();
      this.activeSorter[ key ][sortAsc ? 'desc' : 'asc'] = true;
    },
    defaultClass: () => {
      return {
        id: { asc: false, desc: false },
        title: { asc: false, desc: false },
        date: { asc: false, desc: false },
      }      
    },
    onLogIn: function() {
      $( '#logging' ).modal({
        onApprove: () => {
          var username = $( '#input-ac' ).val();
          axios.post( "/api/login", Qs.stringify({
            username: username,
            password: $( '#input-pw' ).val()
          }) )
          .then( res => {
            if ( res.data['success'] ) {
              $('body').toast({
                position: 'top center',
                class: 'info',
                message: res.data['message'],
              });
              this.currentUser = username;
              this.isSignIn = true;
              this.getNotesByUsername( username );
            }
          }, err => {
            console.log( err );
            $('body').toast({
              class: 'error',
              message: 'Sign in failed.'
            });
          })
          .catch( e => {
            console.log( e );
            $('body').toast({
              class: 'error',
              message: 'Sign in failed. An error occured!'
            });
          })
        },
        onHidden: () => {
          // clear input value
          $( '#input-ac' ).val( '' );
          $( '#input-pw' ).val( '' );
        },
      }).modal( 'show' );
    },
    onLogOut: function() {
      this.currentUser = null;
      this.isSignIn = false;
    },
    onHelp: () => {
      // show helper modal
      $( '#helper' ).modal({ duration: 200 }).modal( 'show' );
    },
    getNotesByUsername: function( name ) {
      if ( !name ) return;

      axios.get( `/api/notes?username=${name}` )
      .then( res => this.noteList = res.data )
      .catch( e => {
        console.log( e );
        $('body').toast({
          position: 'top center',
          class: 'error',
          message: 'Sign in failed. An error occured!'
        });
      })
    }
  },
});