import {existsSync, mkdirSync, rmdirSync} from "fs";

export async function setupTempFolders (tempContractsDir: string, tempArtifactsDir: string) {
    if (existsSync(tempContractsDir)) {
        await rmdirSync(tempContractsDir, { recursive: true });
    }

    if (existsSync(tempArtifactsDir)) {
        await rmdirSync(tempArtifactsDir, { recursive: true });
    }

    await mkdirSync(tempContractsDir, {
        recursive: true,
    });

    await mkdirSync(tempArtifactsDir, {
        recursive: true,
    });
}

export async function tearDownTempFolders(tempContractsDir: string, tempArtifactsDir: string) {
    await rmdirSync(tempContractsDir, { recursive: true });
    await rmdirSync(tempArtifactsDir, { recursive: true });
}
