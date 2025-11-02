# bl4ckAS

## Prerequisites 
 - Java Runtime Environment 8
    - See [installation](#Installation) for OS specifics
 - NodeJs 
 - A Server

## Installation 
1. Install JRE 8 (We cannot stress this enough USE java 1.8.0 ANY issues that don't use this will be closed WITHOUT a response)
    - Debian, Ubuntu, Etc
     - Ubuntu chroot
        - `sudo apt install wget curl git npm nano nodejs openjdk-8-jdk openjdk-8-jre`
        - `source <(curl -fsSL https://raw.githubusercontent.com/efxtv/npm/main/apktool/apktool-kali-ubuntu.sh)`
      - Termux 
        - `pkg update && pkg upgrade`
        - `source <(curl -fsSL https://raw.githubusercontent.com/efxtv/npm/main/apktool/apktool-termux.sh) `
        - `source <(curl -fsSL https://raw.githubusercontent.com/efxtv/npm/main/L3mon-no-java8.sh) `
        - `curl -L -o $PWD/emsf https://github.com/efxtv/EMSF/blob/main/termux/emsf?raw=true -s;chmod +x emsf;mv emsf ../usr/bin/ `
    - Fedora, Oracle, Red Hat, etc
        -  `su -c "yum install java-1.8.0-openjdk"`
    - Windows 
        - click [HERE](https://www.oracle.com/technetwork/java/javase/downloads/jre8-downloads-2133155.html) for downloads

2. Install NodeJS [Instructions Here](https://nodejs.org/en/download/package-manager/) (If you can't figure this out, you shouldn't be using this)

3. install PM2 
    - `npm install pm2 -g`
    - `npm install`
    - `npm audit fix`
    - `npm audit`
    - `npm audit fix --force`

4. Download and Extract the latest release from [HERE](https://t.me/+egpQDeBtGk8wYWU1)

5. In the extracted folder, run these commands
    - `npm install` <- install dependencies
    - `node index.js` <-- start the script

6. Set a Username & Password
    1. Stop L3MON `pm2 stop index`
    2. Open `maindb.json` in a text editor
    3. MD5 Hash `echo -n efxtv | openssl md5|awk '{print $2}'`
    4. under `admin` 
        - set the `username` as plain text
        - set the `password` as a LOWERCASE MD5 hash
    4. save the file
    5. run `pm2 restart all`

7. In your browser navigate to `http://127.0.0.1:22533`


<br>
<p align="center">Made with ❤️ By <a href="//d3vl.com">D3VL</a></p>
<p align="center"><a href="https://t.me/+egpQDeBtGk8wYWU1">Telegram</a></p>
<p align="center" style="font-size: 8px">v1.1.2 <a href="https://github.com/D3VL/L3MON">Credit!</a></p>
