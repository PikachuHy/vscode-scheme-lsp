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
    Executable,
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	StreamInfo
} from 'vscode-languageclient';
import { ensureChickenLspServer, setupChickenEnvironment } from './chicken';
import { ensureGuileLspServer, setupGuileEnvironment } from './guile';

let client: LanguageClient;
let socket: net.Socket;
let writer: SocketMessageWriter;
const replTerminalName = 'Scheme REPL'

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

function setupEnvironment(context: vscode.ExtensionContext, implementation: string, terminal: vscode.Terminal)
{
    switch (implementation) {
        case 'chicken':
            setupChickenEnvironment(context, terminal)
            break
        case 'guile':
            setupGuileEnvironment(context, terminal)
            break;
    }
}

function startLspServer(context: vscode.ExtensionContext) {
    let languageServerCommand: string = '';
    let schemeImplementation: string = vscode.workspace.getConfiguration().get('schemeLsp.schemeImplementation')!
    switch (schemeImplementation) {
        case 'chicken':
            languageServerCommand = 
                vscode.workspace.getConfiguration().get('schemeLsp.chickenLspServer')!;
            break;
        case 'guile':
            languageServerCommand = 
                vscode.workspace.getConfiguration().get('schemeLsp.guileLspServer')!;
            break;
        default:
            console.log('implementation not supported: ' + schemeImplementation);
    }

    const debugLevel: string = 
        vscode.workspace.getConfiguration().get('schemeLsp.debugLevel') || "error";

    const executable: Executable = {
        command: languageServerCommand,
        args: ["--log-level", debugLevel, "--listen", "41827"]
    }
    let serverOptions: ServerOptions = {
        run: executable,
        debug: executable        
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

    console.log('starting client')
    // enable tracing (.Off, .Messages, Verbose)
    client.trace = Trace.Verbose;
    let disposable = client.start();
    context.subscriptions.push(disposable);
    
}
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    startLspServer(context);

    context.subscriptions.push(vscode.commands.registerCommand('scheme-lsp-client.install-chicken-lsp-server',
    function () {ensureChickenLspServer(context, true)}));

    context.subscriptions.push(vscode.commands.registerCommand('scheme-lsp-client.install-guile-lsp-server',
    function () {ensureGuileLspServer(context, true)}));
}

// this method is called when your extension is deactivated
export function deactivate() {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
