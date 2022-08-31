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


import * as vscode from 'vscode';
import { exec, execFile, execFileSync, spawnSync } from 'child_process';
import { downloadJsonRpcTarball, downloadLspServerTarball, extractVersion, findLspServer, installedVersionSufficient, promptForMissingTool } from './util';

const lspGambitServerExecutableName = 'gambit-lsp-server'
const lspGambitServerDirName = 'tools'

export function findGambitLspServer(context: vscode.ExtensionContext) {
    return findLspServer(context, lspGambitServerDirName, lspGambitServerExecutableName);
}

export function isGambitLspServerInstalled(context: vscode.ExtensionContext) {
    let res = spawnSync('gsi',
        ['-e', '(import (codeberg.org/rgherdt/scheme-lsp-server gambit util)) (exit)']
    )
    return res.status == 0
}

function probeAndInstall(libName: string) {
    let res = spawnSync('gsi',
        ['-e', '(import libName)'])
    if (res.status != 0) {
        execFile('gsi', ['-install', libName],
            (error, stdout, stderr) => {
                if (error) {
                    vscode.window.showInformationMessage(`error installing ${libName}: ${error}`);
                    return
                }
            })
    }
}

export function ensureGambitLspServer(
    context: vscode.ExtensionContext,
    force: boolean = false,
    callback: () => void = () => { }
) {
    const isInstalled = isGambitLspServerInstalled(context)
    const installLspServerFunc = () => {
        vscode.window.showInformationMessage(`Installing LSP server for Gambit.`)

        let libs = [
            'codeberg.org/rgherdt/srfi',
            'github.com/ashinn/irregex',
            'github.com/rgherdt/chibi-scheme',
            'codeberg.org/rgherdt/scheme-json-rpc/json-rpc',
            'codeberg.org/rgherdt/scheme-lsp-server/lsp-server'
        ]

        libs.forEach((libName: string) => {
            probeAndInstall(libName)
        })

        vscode.window.showInformationMessage(`LSP server for Gambit successfully installed. Restarting extension.`)

        vscode.commands.executeCommand('scheme-lsp-client.reload-extension')
    }

    if (!isInstalled) {
        promptForMissingTool("Lsp Server for Gambit not found.", installLspServerFunc);
    } else {
        callback()
    }
}




