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
import * as fs from 'fs';
import * as path from 'path';
import { exec, execFile, execFileSync, spawnSync } from 'child_process';
import {downloadJsonRpcTarball, downloadLspServerTarball, extractVersion, findLspServer, installedVersionSufficient, promptForMissingTool} from './util';
import hasbin = require('hasbin');
const lspGambitServerExecutableName = 'gambit-lsp-server'
const lspGambitServerDirName = 'lsp-gambit-server/tools'

export function findGambitLspServer(context: vscode.ExtensionContext)
{
    return findLspServer(context, lspGambitServerDirName, lspGambitServerExecutableName);
}

export function isGambitLspServerInstalled(context: vscode.ExtensionContext)
{
    let res = spawnSync('gsi',
        ['-e', '(import (codeberg.org/rgherdt/scheme-lsp-server gambit util)) (exit)']
    )    
    return res.status == 0
}

export function ensureGambitLspServer(
    context: vscode.ExtensionContext,
    force: boolean = false,
    callback: () => void = () => {}
    )
{
    const isInstalled = isGambitLspServerInstalled(context)
    const installLspServerFunc = () => {
        vscode.window.showInformationMessage(`Installing LSP server for Gambit. This may take some minutes.`)
        execFile('gsi', [
            '-install',
            'codeberg.org/rgherdt/scheme-lsp-server'
        ], (error, stdout, stderr) => /*{
            if (error) {
                vscode.window.showInformationMessage(`error installing LSP server for Gambit: ${error}`);
                return
            }
            execFile('gsc', [
                'codeberg.org/rgherdt/scheme-lsp-server/gambit/util',
                'codeberg.org/rgherdt/scheme-lsp-server/trie',
                'codeberg.org/rgherdt/scheme-lsp-server/document',
                'codeberg.org/rgherdt/scheme-lsp-server/parse',
                'codeberg.org/rgherdt/scheme-lsp-server/adapter',
                'codeberg.org/rgherdt/scheme-lsp-server/gambit',
                'codeberg.org/rgherdt/scheme-lsp-server/lsp-server',
            ], (error, stdout, stderr) => */{
                if (error) {
                    vscode.window.showInformationMessage(`error compiling LSP server modules: ${error}`);
                    return
                }
                callback()
            })    
    }

    if (! isInstalled) {
        promptForMissingTool("Lsp Server for Gambit not found.", installLspServerFunc);        
    } else {
        callback()
    }
}




