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
import { execFileSync } from 'child_process';
import { extractVersion, findLspServer, installedVersionSufficient } from './util';

const lspChickenServerDirName = 'lsp-chicken-server';
const lspChickenServerExecutableName = 'chicken-lsp-server';

export function getChickenLspServerVersion(context: vscode.ExtensionContext)
{
    const lspServerCommand = findChickenLspServer(context);
    console.log(`chicken lsp server command: ${lspServerCommand}`);
    if (lspServerCommand === null) {
        return null;
    }

    const versionOutput = execFileSync(
        lspServerCommand,
        ['--version']
    );
    console.log(versionOutput.toString());
    return extractVersion(versionOutput.toString());
}

export function findChickenLspServer(context: vscode.ExtensionContext)
{
    return findLspServer(context, lspChickenServerDirName, lspChickenServerExecutableName);
}

export function ensureChickenLspServer(
    context: vscode.ExtensionContext,
    force: boolean = false,
    callback: () => void = () => {})
{
    if (findChickenLspServer(context) === null || force) {
        vscode.window.showInformationMessage(
            "Lsp Server for CHICKEN is missing. Please install it with `chicken-install -s lsp-server` and reopen the window.");
    } else if (! installedVersionSufficient(getChickenLspServerVersion(context)!,
                                            vscode.workspace
                                               .getConfiguration()
                                               .get('schemeLsp.chickenLspServerMinVersion')!
    )) {
        vscode.window.showInformationMessage(
            "Lsp Server for CHICKEN is outdated. Please update it with `chicken-install -s lsp-server` and reopen the window.");
    } else {
        callback();
    }
}
