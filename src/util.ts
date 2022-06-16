import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as https from 'https';


export async function downloadTarball(
    context: vscode.ExtensionContext, 
    tarballUrl: string, 
    libraryName: string, 
    targetName: string,
    callback: (installerPath: string) => void)
{
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'installers'))
    const installerPath= path.join(tmpDir, `${libraryName}.tar.gz`);

    https.get(tarballUrl, (res) => {
        const filePath = fs.createWriteStream(installerPath);
        res.pipe(filePath);
        filePath.on('finish',() => {
            filePath.close();
            console.log(`Download of ${targetName} Completed`); 
            callback(installerPath)
        })
    }).on('error', function(err) {
        vscode.window.showErrorMessage(`Error downloading ${targetName}: ${err.message}`)
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

    return downloadTarball(context, tarballUrl, "scheme-json-rpc", targetName, callback)
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

    return await downloadTarball(context, tarballUrl, "scheme-lsp-server", targetName, callback)
}




