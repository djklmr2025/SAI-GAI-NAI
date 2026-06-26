export interface ApktoolProject {
  packageName: string;
  files: {
    [filePath: string]: string;
  };
}

export const APK_PROJECTS: Record<string, ApktoolProject> = {
  'com.arkaios.djportal.apk': {
    packageName: 'com.arkaios.djportal',
    files: {
      'AndroidManifest.xml': `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.arkaios.djportal"
    android:versionCode="1"
    android:versionName="1.0">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/AppTheme">
        
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`,
      'res/values/strings.xml': `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">DJ Portal</string>
    <string name="welcome_msg">Welcome to Arkaios DJ Control Console</string>
    <string name="status_connected">Sticker validated: SAFE</string>
    <string name="btn_play">PLAY SET</string>
</resources>`,
      'smali/MainActivity.smali': `.class public Lcom/arkaios/djportal/MainActivity;
.super Landroid/app/Activity;
.source "MainActivity.java"

# instance fields
.field private isPlaying:Z

# direct methods
.method public constructor <init>()V
    .registers 2
    invoke-direct {p0}, Landroid/app/Activity;-><init>()V
    const/4 v0, 0x0
    iput-boolean v0, p0, Lcom/arkaios/djportal/MainActivity;->isPlaying:Z
    return-void
.end method

.method protected onCreate(Landroid/os/Bundle;)V
    .registers 3
    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V
    const v0, 0x7f030001 # layout:activity_main
    invoke-virtual {p0, v0}, Lcom/arkaios/djportal/MainActivity;->setContentView(I)V
    return-void
.end method`
    }
  },
  'com.android.browser.apk': {
    packageName: 'com.android.browser',
    files: {
      'AndroidManifest.xml': `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.android.browser">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />

    <application
        android:label="@string/browser_name"
        android:icon="@mipmap/ic_browser">
        <activity android:name=".BrowserActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`,
      'res/values/strings.xml': `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="browser_name">Browser</string>
    <string name="search_hint">Search or type web address</string>
    <string name="menu_settings">Browser Settings</string>
</resources>`,
      'smali/BrowserActivity.smali': `.class public Lcom/android/browser/BrowserActivity;
.super Landroid/app/Activity;

.method protected onCreate(Landroid/os/Bundle;)V
    .registers 2
    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V
    return-void
.end method`
    }
  }
};
