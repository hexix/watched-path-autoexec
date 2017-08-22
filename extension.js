// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require("vscode");
var path = require("path");
var cp = require("child_process");

let _channel = null;
function getOutputChannel() {
  if (!_channel) {
    _channel = vscode.window.createOutputChannel("Watched Path AutoExec");
  }
  return _channel;
}

let _config = null;
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
  _config = vscode.workspace.getConfiguration("watched-path-autoexec");
  let debug = _config.get("debug");
  vscode.workspace.workspaceFolders.forEach(folder => {
    if (debug) getOutputChannel().appendLine("workspaceFolder: " + folder.uri);
  });
  if (debug) getOutputChannel().appendLine("started with debug");
  let controller = new AutoExecController();
  context.subscriptions.push(controller);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}
exports.deactivate = deactivate;

class AutoExec {
  static execute() {
    let debug = _config.get("debug");
    let command = _config.get("executable.path");
    if (command) {
      let commandLine = '"' + command + '"';
      let args = _config.get("executable.args");
      if (args) {
        args.forEach(arg => {
          commandLine += ' "';
          commandLine += arg;
          commandLine += '"';
        });
      }
      if (debug) getOutputChannel().appendLine("executing: " + commandLine);
      cp
        .exec(commandLine, (err, stdout, stderr) => {
          if (err) {
            getOutputChannel().appendLine(err);
          }
        })
        .on("error", stdErr => {
          getOutputChannel().appendLine(stdErr);
        })
        .on("message", stdOut => {
          if (debug) getOutputChannel().appendLine(stdOut);
        });
    }
  }
}

class AutoExecController {
  constructor() {
    let debug = _config.get("debug");

    let subscriptions = [];
    let watchedPaths = _config.get("watched");
    if (watchedPaths) {
      watchedPaths.forEach(watched => {
        if (debug) getOutputChannel().appendLine("watching " + watched);
        var fileWatcher = vscode.workspace.createFileSystemWatcher(watched, false, false, false);
        fileWatcher.onDidChange(this.execute, this, subscriptions);
        fileWatcher.onDidCreate(this.execute, this, subscriptions);
        fileWatcher.onDidDelete(this.execute, this, subscriptions);
      });
      this._disposable = vscode.Disposable.from(...subscriptions);
    }
  }

  execute(e) {
    // if (debug) getOutputChannel().appendLine("execute: " + e.path);
    AutoExec.execute();
  }

  dispose() {
    if (this._disposable) this._disposable.dispose();
  }
}
