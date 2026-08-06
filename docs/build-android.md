# APKビルド手順

## この開発コンテナでの実施結果

この開発コンテナにはAndroid SDKが標準では存在しなかったが、Android SDK Command-line Tools（`commandlinetools-linux-11076708_latest.zip`）を`https://dl.google.com/android/repository/`から取得し、`/opt/android-sdk`に導入した上で **debug APKのビルドに成功した**（`android/app/build/outputs/apk/debug/app-debug.apk`、約23MB）。

### 実施した手順（再現用）

```bash
export PATH=/opt/node22/bin:$PATH

# 1. Capacitorコア導入・初期化
npm i @capacitor/core @capacitor/cli
npx cap init "どこでもプレゼン" "com.dokopre.app" --web-dir dist

# 2. Web版ビルド（Capacitorはビルド済みのdist/を取り込む）
npm run build

# 3. Androidプラットフォーム追加
npm i @capacitor/android
npx cap add android

# 4. ネイティブ機能プラグイン追加
npm i @capacitor/screen-orientation @capacitor/share @capacitor/filesystem
npx cap sync android

# 5. Android SDK Command-line Tools導入（このコンテナには未導入だったため）
mkdir -p /opt/android-sdk/cmdline-tools
# commandlinetools-linux-11076708_latest.zip を取得し、
# /opt/android-sdk/cmdline-tools/latest/ に展開（binディレクトリがlatest直下に来るように配置）
export ANDROID_HOME=/opt/android-sdk
export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$PATH
yes | sdkmanager --sdk_root=$ANDROID_HOME --licenses
sdkmanager --sdk_root=$ANDROID_HOME "platform-tools" "platforms;android-35" "build-tools;35.0.0"
# ※ android/variables.gradle の compileSdkVersion/targetSdkVersion は36指定のため、
#   実際のビルド時にAndroid Gradle Pluginが platforms;android-36 を自動追加取得した。

# 6. local.properties でSDKパスを指定
echo "sdk.dir=/opt/android-sdk" > android/local.properties

# 7. debug APKビルド（このコンテナのJDK 21 / Gradle 8.14.3を使用。
#    android/gradle/wrapper/gradle-wrapper.propertiesが要求するバージョンと一致するため
#    ./gradlewのラッパーZIP再ダウンロードを避け、システムのgradleコマンドを直接使用した）
export PATH=/opt/gradle-8.14.3/bin:$PATH
cd android
gradle assembleDebug --no-daemon
```

結果: `BUILD SUCCESSFUL`（初回は184 actionable tasks: 184 executed、約4分。プラグイン統合後の再ビルドは184 actionable tasks: 27 executed、約30秒）。生成物は`android/app/build/outputs/apk/debug/app-debug.apk`。

### 実機・エミュレータでの検証について

この開発コンテナにはAndroidエミュレータ・実機がなく、`adb install`や実機起動による動作確認は行っていない（D-001の想定リスク通り）。debug APKのビルド成功とWeb版でのPlaywright動作確認（`npm run preview`、Capacitorプラグイン統合後も従来通り動作すること）までを本コンテナでの完了条件とした。実機・エミュレータでの起動確認・回転ロック/共有/保存の動作確認はUser側の環境で行う必要がある。

## User環境（Android Studio等）でのビルド手順

1. リポジトリを取得し、Node.js 22系で依存関係をインストールする。
   ```bash
   npm install
   ```
2. Web版をビルドし、Androidプロジェクトに反映する。
   ```bash
   npm run build
   npx cap sync android
   ```
3. Android Studioで`android/`ディレクトリを開く（Android Studioが必要なSDKコンポーネントの取得を促す場合はそれに従う）。
4. デバッグ実行: Android Studioの「Run」で実機/エミュレータに直接インストールするか、以下でdebug APKをビルドする。
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
   生成物: `android/app/build/outputs/apk/debug/app-debug.apk`
5. リリースビルドを作成する場合は、署名鍵の作成・`android/app/build.gradle`への署名設定が別途必要（本タスクでは未実施。debug APKのみを完了条件とした）。
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
6. インストール・起動確認（実機/エミュレータ、`adb`が使える環境）:
   ```bash
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```
   確認すべき項目: (1) ホーム画面〜編集画面〜発表画面の遷移、(2) 発表画面での画面回転ロック（`@capacitor/screen-orientation`）、(3) PNG/PDF書き出し時の保存先選択・共有シート表示（`@capacitor/filesystem`+`@capacitor/share`）。

## バージョン情報（本コンテナでビルドに使用した組み合わせ）

- Node.js: 22.22.2（`/opt/node22`）
- JDK: OpenJDK 21.0.10（`/usr/bin/java`）
- Gradle: 8.14.3（`android/gradle/wrapper/gradle-wrapper.properties`が要求するバージョンと一致）
- Android SDK Command-line Tools: 11076708（`commandlinetools-linux-11076708_latest.zip`）
- インストール済みSDKコンポーネント: `platform-tools 37.0.1`, `platforms;android-35`, `platforms;android-36`（AGPが自動取得）, `build-tools;35.0.0`
- Capacitor: `@capacitor/core` / `@capacitor/cli` / `@capacitor/android` 8.5.0、`@capacitor/screen-orientation` 8.0.1、`@capacitor/share` 8.0.1、`@capacitor/filesystem` 8.1.2
- `android/variables.gradle`: `compileSdkVersion=36`, `targetSdkVersion=36`, `minSdkVersion=24`
