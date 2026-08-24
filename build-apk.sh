#!/bin/bash
set -e

echo "=== 1. Setting up Java 21 and Android SDK in Cloud Container ==="
export JAVA_HOME=/tmp/jdk21
export ANDROID_HOME=/tmp/android-sdk
export ANDROID_SDK_ROOT=/tmp/android-sdk
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH

# 1. Download OpenJDK 21 if not present
if [ ! -f "/tmp/jdk21/bin/java" ]; then
  echo "Downloading OpenJDK 21..."
  mkdir -p /tmp/jdk21
  curl -sSL https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.6%2B7/OpenJDK21U-jdk_x64_linux_hotspot_21.0.6_7.tar.gz | tar -xz -C /tmp/jdk21 --strip-components=1
fi
echo "Java ready: $($JAVA_HOME/bin/java -version 2>&1 | head -n 1)"

# 2. Download Android Command-line Tools if not present
if [ ! -f "/tmp/android-sdk/cmdline-tools/latest/bin/sdkmanager" ]; then
  echo "Downloading Android Commandline Tools..."
  mkdir -p /tmp/android-sdk/cmdline-tools
  curl -sSL -o /tmp/cmdline-tools.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
  unzip -q -o /tmp/cmdline-tools.zip -d /tmp/android-sdk/cmdline-tools
  rm -rf /tmp/android-sdk/cmdline-tools/latest
  mv /tmp/android-sdk/cmdline-tools/cmdline-tools /tmp/android-sdk/cmdline-tools/latest
  rm -f /tmp/cmdline-tools.zip
fi

# 3. Pre-accept licenses
mkdir -p /tmp/android-sdk/licenses
printf "\n8933bad161af4178b1185d1a37fbf41ea5269c55\nd56f5187479451eabf01fb78ba6edcb13b1978f9\n24333f8a63b6825ea9c5514f83c2829b004d1fee\n" > /tmp/android-sdk/licenses/android-sdk-license
printf "\n84831b9409646a918e30573bab4c9c91346d8abd\n" > /tmp/android-sdk/licenses/android-sdk-preview-license

echo "Installing Android platform 36 & 35 and build tools..."
yes | sdkmanager --sdk_root=/tmp/android-sdk "platforms;android-36" "build-tools;36.0.0" "platforms;android-35" "build-tools;35.0.0" "platform-tools" > /dev/null 2>&1 || true

# 4. Download Standalone Gradle 8.14.3 if not present
if [ ! -f "/tmp/gradle-8.14.3/bin/gradle" ]; then
  echo "Downloading Gradle 8.14.3..."
  mkdir -p /tmp/gradle
  curl -sSL -o /tmp/gradle.zip https://services.gradle.org/distributions/gradle-8.14.3-bin.zip
  unzip -q -o /tmp/gradle.zip -d /tmp
  rm -f /tmp/gradle.zip
fi
export PATH=/tmp/gradle-8.14.3/bin:$PATH
echo "Gradle ready: $(gradle --version 2>&1 | head -n 3)"

# 5. Build Vite web assets and sync to Capacitor
echo "=== 2. Building Vite Application & Syncing to Capacitor ==="
npm run build
npx cap sync android

# Ensure local.properties points to android sdk
echo "sdk.dir=/tmp/android-sdk" > android/local.properties

# 6. Build Debug APK with standalone Gradle
echo "=== 3. Building Debug APK via Gradle ==="
cd android
gradle assembleDebug --no-daemon

# 6. Verify and output
echo "=== 4. Checking Output APK ==="
APK_FILE="app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_FILE" ]; then
  echo "SUCCESS! APK file generated at: android/$APK_FILE"
  ls -lh "$APK_FILE"
else
  echo "Build failed: $APK_FILE not found"
  exit 1
fi
