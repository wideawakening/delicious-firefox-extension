Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

const nsIYDebugService = Components.interfaces.nsIYDebugService;

const CLASS_ID = Components.ID("{559013d0-6099-11db-b0de-0800200c9a66}");
const CLASS_NAME = "Service to print log and debug messages";
const CONTRACT_ID = "@mozilla.org/ybookmarks-debug-service;1";

/**
 * Class definition
 */
function YDebugService () {
	this._getPrefs();
  this._createLogFile();
  this._createLogStream();
}

YDebugService.prototype = {
	//nsISupports
	classDescription: CLASS_NAME,
	contractID: CONTRACT_ID,
	classID: CLASS_ID,
	QueryInterface: XPCOMUtils.generateQI([nsIYDebugService]),
	
    _debugEnabled: null,
    _logEnabled: null, 
    _logFileName: "ybookmarks@yahoo.log",
    _maxLogFileSize: 1 * 1048 * 1048,
    _maxLogLines: 10000,
    _logFile: null,
    _logStream: null,
    _nLogLinesPrinted: 0,
    _lastLogTimeStamp: 0,
    _lastLogTimeString: "",

    _getPrefs: function() {
        this._logEnabled = this._debugEnabled = false;
        try {
	    var prefs = 
                Components.classes[ "@mozilla.org/preferences-service;1" ].getService( 
                    Components.interfaces.nsIPrefBranch );
	    this._logEnabled = prefs.getBoolPref( "extensions.ybookmarks@yahoo.log" );
	    this._debugEnabled = prefs.getBoolPref( "extensions.ybookmarks@yahoo.debug" );
        }
        catch( e ) { }
    },
    
    on: function( refresh ) {
        if( refresh ) {
            this._getPrefs();
        }
        return this._debugEnabled;
    },

    _createLogFile: function() {
        var dirService = 
            ( Components.classes[ "@mozilla.org/file/directory_service;1" ] ).getService( 
                Components.interfaces.nsIProperties );
        this._logFile = 
            dirService.get( "ProfD", Components.interfaces.nsILocalFile );
        this._logFile.append( this._logFileName );
        if( this._logFile.exists() && ( this._logFile.fileSize > this._maxLogFileSize ) ) {
            this._logFile.remove( false );
        }
        if( !this._logFile.exists() ) {
            this._logFile.create( Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 00644 );
        }
    },

    _createLogStream: function() {
        this._logStream = 
            ( Components.classes[ "@mozilla.org/network/file-output-stream;1" ] ).createInstance( 
                Components.interfaces.nsIFileOutputStream );
        // opening in append and write-only mode
        this._logStream.init( this._logFile, 0x10 | 0x02, 00644, 0 );
        this._nLogLinesPrinted = 0;
        this._lastLogTimeStamp = 0;
        this._lastLogTimeString = "";
        this._printVersion();
    },

    _printVersion: function() {
	var bundleService = 
            Components.classes[ "@mozilla.org/intl/stringbundle;1" ].getService( 
                Components.interfaces.nsIStringBundleService );
        var bundle = 
            bundleService.createBundle( "chrome://ybookmarks/locale/ybookmarks.properties" );
	var versionNum = bundle.GetStringFromName( "extensions.ybookmarks.versionNum" );
        this.printLog( "*********** LOG CREATED. EXT VER: " + versionNum + " *************" );
        
        var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                        .getService(Components.interfaces.nsIXULAppInfo);        
        var proto = Components.classes["@mozilla.org/network/protocol;1?name=http"]
          .getService(Components.interfaces.nsIHttpProtocolHandler);
        var platform = proto.platform;
        var userAgent = proto.userAgent;
        
        this.printLog( "*********** OS: " + platform + "  FX VER: " + appInfo.version + " *************" );
        this.printLog( "*********** User Agent: " + userAgent + " *************" );
    },

    _getTimeField: function() {
        var now = new Date();
        var timeField;
        // create new timestamp only if a minute has passed
        if( ( now.getTime() - this._lastLogTimeStamp ) > 60 ) {
            timeField = "[" + 
                now.getFullYear() + "/" + ( now.getMonth() + 1 ) + "/" + now.getDate() + " " +
                now.getHours() + ":" + now.getMinutes()
                + "] ";
            this._lastLogTimeString = timeField;
            this._lastLogTimeStamp = now.getTime();
        }
        else {
            timeField = this._lastLogTimeString;
        }
        return timeField;
    },

    printDebug: function( message ) {
        if( this._debugEnabled ) {
            this.printLog( message );
        }
    },

    printLog: function( message ) {
        // dump to file
        try {
            if( this._nLogLinesPrinted > this._maxLogLines ) {
                this._logStream.close();
                this._logFile.remove( false );
                this._createLogFile();
                this._createLogStream();
            }
            var logMessage = this._getTimeField();
            logMessage += message;
            logMessage += "\n";
            this._logStream.write( logMessage, logMessage.length );
            ++this._nLogLinesPrinted;
        }
        catch( e ) {
            if( this._logEnabled ) {
                dump( "exception while trying to write to log file: " + e + "\n" );
            }
        }
        
        // now dump to console
        if( this._logEnabled ) {
            dump( message + '\n' );
        }
    }
}

/**
 * XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
 * XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
 */
if (XPCOMUtils.generateNSGetFactory)
var NSGetFactory = XPCOMUtils.generateNSGetFactory([YDebugService]);
else
var NSGetModule = XPCOMUtils.generateNSGetModule([YDebugService]);