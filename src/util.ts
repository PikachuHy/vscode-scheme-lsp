import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as https from 'https';
import hasbin = require('hasbin');


export async function downloadTarball(
    tarballUrl: string, 
    libraryName: string, 
    callback: (installerPath: string) => void)
{
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'installers'))
    const installerPath= path.join(tmpDir, `${libraryName}.tar.gz`);

    https.get(tarballUrl, (res) => {
        const filePath = fs.createWriteStream(installerPath);
        res.pipe(filePath);
        filePath.on('finish',() => {
            filePath.close();
            console.log(`Download of ${libraryName} Completed`);
            callback(installerPath)
        })
    }).on('error', function(err) {
        vscode.window.showErrorMessage(`Error downloading ${libraryName}: ${err.message}`)
    })
    return installerPath;
}

export async function downloadJsonRpcTarball(
    context: vscode.ExtensionContext, 
    targetName: string,
    callback: (installerPath: string) => void)
{
    const tarballDirectoryUrl: string = 
        vscode.workspace.getConfiguration().get('schemeLsp.jsonRpcTarballDirectoryUrl') !

    const jsonRpcVersion: string = 
        vscode.workspace.getConfiguration().get('schemeLsp.jsonRpcVersion')!
    const tarballUrl: string =
        new URL(`${jsonRpcVersion}.tar.gz`, tarballDirectoryUrl).toString()

    return downloadTarball(tarballUrl, "scheme-json-rpc", callback)
}

export async function downloadLspServerTarball(
    context: vscode.ExtensionContext,
    targetName: string,
    callback: (installerPath: string) => void)
{
    const tarballDirectoryUrl: string = 
        vscode.workspace.getConfiguration().get('schemeLsp.lspServerTarballDirectoryUrl')!

    const lspServerVersion:string = 
        vscode.workspace.getConfiguration().get('schemeLsp.lspServerVersion')!
    const tarballUrl: string =
        new URL(`${lspServerVersion}.tar.gz`, tarballDirectoryUrl).toString()

    return await downloadTarball(tarballUrl, "scheme-lsp-server", callback)
}

