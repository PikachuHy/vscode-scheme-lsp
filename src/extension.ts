// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as net from 'net';
import { SocketMessageWriter } from 'vscode-jsonrpc';
import { Trace } from 'vscode-jsonrpc';
import { workspace } from 'vscode';
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	StreamInfo,
	TransportKind
} from 'vscode-languageclient';

let client: LanguageClient;
let socket: net.Socket;
let writer: SocketMessageWriter;

function startLspServer() {
    vscode.window.showInformationMessage('Scheme LSP server started!');

    const terminal = vscode.window.createTerminal(`Scheme REPL`);
    let replCmdName: string = '';
    let schemeImplementation = vscode.workspace.getConfiguration().get('schemeLsp.schemeImplementation')
    switch (schemeImplementation) {
        case 'chicken':
            replCmdName = 'schemeLsp.chickenReplCommand';
            break;
        case 'guile':
            replCmdName = 'schemeLsp.guileReplCommand';
            break;
        default:
            console.log('implementation not supported: ' + schemeImplementation);
    }

    const replCmd: string =
        vscode.workspace.getConfiguration().get(replCmdName) || '';
    
    const debugLevel: number = 
        vscode.workspace.getConfiguration().get('schemeLsp.debugLevel') || 0;

    const serverPort: number = 
        vscode.workspace.getConfiguration().get('schemeLsp.lspServerPort') || 4242;

    terminal.show(true);
    terminal.sendText(replCmd, true);
    new Promise((resolve, reject) => {
        setTimeout(() => 
            {
                terminal.sendText(
                    `(import (lsp-server)) 
                     (define $thread
                       (parameterize ((lsp-server-log-level '${debugLevel}))
                         (start-lsp-server/background ${serverPort})))
                     `, true);
                resolve(true);
            }, 300)})
            .then((result) => {terminal.sendText('(display "Scheme LSP server started\\n")', true)});

    return;
}

function connectToLspServer() {
    const configPort: number = 
        vscode.workspace.getConfiguration().get('schemeLsp.lspServerPort') || 4242;

    let connectionInfo = {
        port: configPort
    };

    socket = net.connect(connectionInfo);
    writer = new SocketMessageWriter(socket);

    let serverOptions: ServerOptions = () => {
        // Connect to language server via socket
        let result: StreamInfo = {
            writer: socket,
            reader: socket,
            detached: true
        };
        return Promise.resolve(result);
        
    };
    
    let clientOptions: LanguageClientOptions = {
        // Register the server for plain text documents
        documentSelector: [{ scheme: 'file', language: 'scheme' }],
        synchronize: {
            // Notify the server about file changes to '.clientrc files contained in the workspace
            fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
        }
    };

    client = new LanguageClient(
        'schemeLspClient',
        'Scheme LSP Client',
        serverOptions,
        clientOptions
    );

    // enable tracing (.Off, .Messages, Verbose)
    client.trace = Trace.Verbose;
    let disposable = client.start();
    //context.subscriptions.push(disposable);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    context.subscriptions.push(vscode.commands.registerCommand('scheme-lsp-client.launch',
        function() {
            startLspServer();
            setTimeout(function() {vscode.commands.executeCommand('scheme-lsp-client.connect')},
                       1000);
            }));

    //connectToLspServer();
    context.subscriptions.push(vscode.commands.registerCommand('scheme-lsp-client.connect',
        function () {connectToLspServer()}));

    context.subscriptions.push(vscode.commands.registerCommand('scheme-lsp-client.load-file',
        function () { 
            let message = {jsonrpc: "2.0", id: 0, method: "custom/loadFile", params: {textDocument: {uri: "file://" + vscode.window.activeTextEditor?.document.fileName}}};
            writer.write(message);
        }
    ))

}

// this method is called when your extension is deactivated
export function deactivate() {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
