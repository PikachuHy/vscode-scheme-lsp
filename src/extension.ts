// Scheme LSP client for VS Codium and co.

// Copyright (C) 2022  Ricardo Gabriel Herdt <r.herdt@posteo.de>
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.


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
    StreamInfo
} from 'vscode-languageclient';
import { ensureChickenLspServer, chickenEnvironmentMap, findChickenLspServer } from './chicken';
import { ensureGuileLspServer, guileEnvironmentMap, findGuileLspServer } from './guile';
import { spawn } from 'child_process';

let client: LanguageClient;
let socket: net.Socket;
let writer: SocketMessageWriter;

export function ensureSchemeLspServer(
    context: vscode.ExtensionContext,
    force: boolean = false,
    callback: () => void = () => {})
{
    const schemeImplementation = 
        vscode.workspace.getConfiguration().get('schemeLsp.schemeImplementation')

    if (schemeImplementation === "guile") {
        ensureGuileLspServer(context, force, callback);
    } else if (schemeImplementation === "chicken") {
        ensureChickenLspServer(context, force, callback);
    }
}

function setupEnvironment(context: vscode.ExtensionContext, implementation: string)
{
    let env = {};
    switch (implementation) {
        case 'chicken':
            env = chickenEnvironmentMap(context)
            break
        case 'guile':
            env = guileEnvironmentMap(context)
            break;
    }
    return env
}


function startLspServer(context: vscode.ExtensionContext) {
    let languageServerCommand: string = '';
    let schemeImplementation: string = vscode.workspace.getConfiguration().get('schemeLsp.schemeImplementation')!
    switch (schemeImplementation) {
        case 'chicken':
            languageServerCommand = 
                findChickenLspServer(context) || '';
            break;
        case 'guile':
            languageServerCommand = 
                findGuileLspServer(context) || '';
            break;
        default:
            console.log('implementation not supported: ' + schemeImplementation);
    }

    const debugLevel: string = 
        vscode.workspace.getConfiguration().get('schemeLsp.debugLevel') || "error";

    const tcpPort: number = 
        vscode.workspace.getConfiguration().get('schemeLsp.tcpPort')!

    if (languageServerCommand == '') {
        throw new Error('Unable to find an LSP server. Aborting.')
    }

    return new Promise((resolve, reject) => {
        const env = setupEnvironment(context, schemeImplementation)

        spawn(languageServerCommand,
              ["--log-level", debugLevel, "--listen", "41827", "--tcp", tcpPort.toString()],
              {
                  detached: false,
                  stdio: 'ignore',
                  env: env
              });
        resolve(true)       
    })
}


function connectToLspServer(context: vscode.ExtensionContext) {
    const tcpPort: number = 
        vscode.workspace.getConfiguration().get('schemeLsp.tcpPort') || 4242;
    let connectionInfo = {
        port: tcpPort
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
    context.subscriptions.push(disposable);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    ensureSchemeLspServer(context, false, () => {
        startLspServer(context)
            .then((result) =>
                setTimeout(
                    () => vscode.commands.executeCommand('scheme-lsp-client.connect'),
                    1000)
                 )
    })

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'scheme-lsp-client.connect',
            function () {connectToLspServer(context)}));

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'scheme-lsp-client.install-chicken-lsp-server',
            function () {ensureChickenLspServer(context, true)}));

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'scheme-lsp-client.install-guile-lsp-server',
            function () {ensureGuileLspServer(context, true)}));
}

// this method is called when your extension is deactivated
export function deactivate() {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
