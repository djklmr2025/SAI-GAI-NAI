import { useState, useEffect } from 'react';
import { auth, loginWithGoogle, logout, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, LogIn, LogOut, ShieldCheck, Cpu, Database, Globe, Terminal, Activity, Package, Layers, Settings, Home, Search, PlusCircle, Trash2, Play, Square, RefreshCcw, Download, UploadCloud, Smartphone as PhoneIcon, HardDrive, MonitorSmartphone, DownloadCloud, Monitor, Maximize, RotateCcw, RotateCw, ChevronLeft, Menu, Music, CheckCircle, AlertCircle, Code2, Tv, Wifi, Power, Cast, Radio, Server, PlayCircle, StopCircle, Wrench, FileCode, FolderTree, Hammer, Binary, Fingerprint, Share2, Heart } from 'lucide-react';
import { VirtualDevice, VirtualApp, UserProfile } from './types';
import { analyzeAppMetadata } from './services/aiService';
import { validateSecuritySticker } from './services/djService';
import { parseApk } from './services/apkParser';
import { APK_PROJECTS } from './services/apktoolFiles';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { QRCodeCanvas } from 'qrcode.react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState<VirtualDevice | null>(null);
  const [activeApp, setActiveApp] = useState<VirtualApp | null>(null);
  const [isBooting, setIsBooting] = useState(false);
  const [bootLog, setBootLog] = useState<string[]>([]);
  const [runtimeEngine, setRuntimeEngine] = useState<'HLE' | 'ARC' | 'VULKAN'>('HLE');
  const [logs, setLogs] = useState<string[]>([]);
  const [deepLinkUrl, setDeepLinkUrl] = useState<string>('');
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [isAppSwitcherOpen, setIsAppSwitcherOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [stickerUrl, setStickerUrl] = useState('');
  const [validationResult, setValidationResult] = useState<{ success: boolean; message: string; metadata?: any } | null>(null);
  
  // WebRTC/VNC Streaming States
  const [webrtcUrl, setWebrtcUrl] = useState<string>('');
  const [webrtcActiveTab, setWebrtcActiveTab] = useState<'dockerify' | 'google' | 'apkonline' | 'novnc' | 'tunnel'>('dockerify');
  const [webrtcLogs, setWebrtcLogs] = useState<string[]>(["[SYSTEM] Streaming Hub initialized.", "[SYSTEM] Awaiting signaling or direct noVNC link..."]);
  const [webrtcIsConnecting, setWebrtcIsConnecting] = useState<boolean>(false);
  const [webrtcIsConnected, setWebrtcIsConnected] = useState<boolean>(false);
  const [webrtcLatency, setWebrtcLatency] = useState<number>(0);
  const [webrtcFps, setWebrtcFps] = useState<number>(0);

  // Apktool Studio States
  const [apktoolSelectedApk, setApktoolSelectedApk] = useState<string>('com.arkaios.djportal.apk');
  const [apktoolActiveTab, setApktoolActiveTab] = useState<'decompile' | 'rebuild' | 'about'>('decompile');
  const [apktoolIsDecompiled, setApktoolIsDecompiled] = useState<boolean>(false);
  const [apktoolIsDecompiling, setApktoolIsDecompiling] = useState<boolean>(false);
  const [apktoolSelectedFile, setApktoolSelectedFile] = useState<string>('AndroidManifest.xml');
  const [apktoolLogs, setApktoolLogs] = useState<string[]>(["[APKTOOL] Studio ready.", "[INFO] Select an APK package and click Decompile."]);
  const [apktoolEditedContents, setApktoolEditedContents] = useState<Record<string, string>>({});
  const [apktoolIsRebuilding, setApktoolIsRebuilding] = useState<boolean>(false);
  const [apktoolIsRebuilt, setApktoolIsRebuilt] = useState<boolean>(false);
  const [apktoolIsSigned, setApktoolIsSigned] = useState<boolean>(false);

  const handleApktoolDecompile = async () => {
    setApktoolIsDecompiling(true);
    setApktoolIsDecompiled(false);
    setApktoolIsRebuilt(false);
    setApktoolIsSigned(false);
    setApktoolLogs(prev => [...prev, `[APKTOOL] apktool d ${apktoolSelectedApk} -o decoded_project/`]);
    
    const steps = [
      `[APKTOOL] I: Using Apktool v3.0.2 on ${apktoolSelectedApk}`,
      `[APKTOOL] I: Loading resource table...`,
      `[APKTOOL] I: Decoding AndroidManifest.xml with resources...`,
      `[APKTOOL] I: Loading resource table from file: /root/.local/share/apktool/framework/1.apk`,
      `[APKTOOL] I: Regular manifest structure detected.`,
      `[APKTOOL] I: Decoding file-resources (resources.arsc)...`,
      `[APKTOOL] I: Decoding values */* XMLs...`,
      `[APKTOOL] I: Baksmaliing classes.dex...`,
      `[APKTOOL] I: Copying assets and libs...`,
      `[APKTOOL] I: Copying unknown files...`,
      `[APKTOOL] I: Copying original files...`,
      `[APKTOOL] Studio: Decompile of ${apktoolSelectedApk} completed successfully.`
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setApktoolLogs(prev => [...prev, step]);
    }

    const proj = APK_PROJECTS[apktoolSelectedApk];
    if (proj) {
      setApktoolEditedContents(proj.files);
      const firstFile = Object.keys(proj.files)[0] || 'AndroidManifest.xml';
      setApktoolSelectedFile(firstFile);
    }
    
    setApktoolIsDecompiling(false);
    setApktoolIsDecompiled(true);
    addLog(`Apktool: Decompiled ${apktoolSelectedApk}`);
  };

  const handleApktoolRebuild = async () => {
    setApktoolIsRebuilding(true);
    setApktoolLogs(prev => [...prev, `[APKTOOL] apktool b decoded_project/ -o modified_${apktoolSelectedApk}`]);
    
    const steps = [
      `[APKTOOL] I: Using Apktool v3.0.2`,
      `[APKTOOL] I: Checking whether resources has modified...`,
      `[APKTOOL] I: Smaliing smali/ folder into classes.dex...`,
      `[APKTOOL] I: Building resources...`,
      `[APKTOOL] I: Copying libs...`,
      `[APKTOOL] I: Building apk file...`,
      `[APKTOOL] Studio: Rebuild completed successfully. Output: modified_${apktoolSelectedApk}`,
      `[SIGNER] apksigner sign --ks debug.keystore modified_${apktoolSelectedApk}`,
      `[SIGNER] APK signed successfully with debug key.`,
      `[ADB] adb install -r modified_${apktoolSelectedApk}`
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setApktoolLogs(prev => [...prev, step]);
    }

    setApktoolIsRebuilding(false);
    setApktoolIsRebuilt(true);
    setApktoolIsSigned(true);
    addLog(`Apktool: Rebuilt, signed and re-installed modified_${apktoolSelectedApk}`);
    
    const proj = APK_PROJECTS[apktoolSelectedApk];
    if (proj && device && user) {
      const originalApp = device.installedApps.find(a => a.packageName === proj.packageName);
      if (originalApp) {
        let updatedName = originalApp.name;
        const stringsXml = apktoolEditedContents['res/values/strings.xml'];
        if (stringsXml) {
          const match = stringsXml.match(/<string name="app_name">([^<]+)<\/string>/);
          if (match && match[1]) {
            updatedName = match[1];
          }
        }
        
        const updatedApps = device.installedApps.map(a => 
          a.packageName === proj.packageName ? { ...a, name: updatedName, version: '1.0-mod' } : a
        );
        const updatedDevice = { ...device, installedApps: updatedApps };
        await setDoc(doc(db, 'devices', user.uid), updatedDevice);
        setDevice(updatedDevice);
        addLog(`Device Manager: Upgraded ${originalApp.name} to custom mod: ${updatedName}`);
      }
    }
  };


  const bootApp = async (app: VirtualApp) => {
    setIsBooting(true);
    setBootLog([]);
    const logs = [
      "Initializing SAI-GAI-NAI Kernel...",
      "Loading ARC Runtime (Legacy Bridge)...",
      "Mounting OBB/Data partitions...",
      "Verifying APK signature...",
      "Starting Zygote process...",
      "Launching Activity: " + app.packageName
    ];

    for (const log of logs) {
      setBootLog(prev => [...prev, `[INIT] ${log}`]);
      await new Promise(r => setTimeout(r, 400));
    }

    setTimeout(() => {
      setIsBooting(false);
      setActiveApp(app);
      addLog(`Launched ${app.name} via ${runtimeEngine} Engine.`);
    }, 500);
  };

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 49)]);
  };

  const handleDjActivation = async () => {
    if (!user || !validationResult?.success) return;
    
    addLog("Activating DJ Profile...");
    const updatedProfile = { ...userProfile!, isDj: true };
    await setDoc(doc(db, 'users', user.uid), updatedProfile);
    setUserProfile(updatedProfile);
    addLog("DJ Profile Activated successfully.");
    alert("Welcome, DJ! Your professional profile is now active.");
  };

  const handleStickerValidation = async () => {
    if (!stickerUrl) return;
    setIsValidating(true);
    setValidationResult(null);
    addLog(`Validating Security Sticker: ${stickerUrl}`);
    
    try {
      const result = await validateSecuritySticker(stickerUrl);
      setValidationResult(result);
      if (result.success) {
        addLog("Security Sticker Validated: GENUINE_CODE_VERIFIED");
      } else {
        addLog(`Validation Failed: ${result.message}`);
      }
    } catch (err) {
      addLog(`Validation Error: ${err}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleConnectWebRtc = async () => {
    setWebrtcIsConnecting(true);
    setWebrtcLogs(prev => [...prev, `[SYSTEM] Contacting server gateway...`]);
    
    const steps = [
      `[HTTP] Initiating connection handshake...`,
      webrtcUrl ? `[WS] Socket handshake resolved with ${webrtcUrl}` : `[WS] Socket handshake resolved with simulated localhost`,
      `[WEBRTC] Gathering ICE candidates...`,
      `[WEBRTC] Creating local SDP Offer...`,
      `[WEBRTC] Remote SDP Answer received...`,
      `[WEBRTC] WebRTC Session negotiated successfully.`,
      `[H264] Demuxing live GLES Vulkan stream...`,
      `[ADB] Connection initialized (transport: usb)`
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 300));
      setWebrtcLogs(prev => [...prev, step]);
    }

    setWebrtcIsConnecting(false);
    setWebrtcIsConnected(true);
    setWebrtcLatency(Math.floor(Math.random() * 25) + 12);
    setWebrtcFps(60);
    addLog(webrtcUrl ? `WebRTC connected to real stream at ${webrtcUrl}` : `WebRTC connected to simulated high-performance Android stream.`);
  };

  const handleDisconnectWebRtc = () => {
    setWebrtcIsConnected(false);
    setWebrtcIsConnecting(false);
    setWebrtcLatency(0);
    setWebrtcFps(0);
    setWebrtcLogs(prev => [...prev, `[SYSTEM] Stream disconnected manually.`, `[ADB] transport closed.`]);
    addLog("WebRTC: Disconnected stream session.");
  };

  const handleUninstall = async (app: VirtualApp) => {
    if (!device || !user) return;
    if (!confirm(`Are you sure you want to uninstall ${app.name}? This will remove all local data.`)) return;
    
    addLog(`Uninstalling ${app.name}...`);
    const updatedApps = device.installedApps.filter(a => a.id !== app.id);
    const updatedDevice = { ...device, installedApps: updatedApps };
    
    await setDoc(doc(db, 'devices', user.uid), updatedDevice);
    setDevice(updatedDevice);
    setActiveApp(null);
    addLog(`${app.name} uninstalled successfully.`);
  };

  const handleSaveToCloud = async (app: VirtualApp) => {
    addLog(`Syncing ${app.name} to Cloud Storage...`);
    // Simulated cloud sync
    setTimeout(() => {
      addLog(`${app.name} synced to global SAI-GAI-NAI repository.`);
      alert(`${app.name} has been backed up to your cloud profile.`);
    }, 1500);
  };

  const handleAIUnmask = async (app: VirtualApp) => {
    if (!device || !user) return;
    setIsAnalyzing(true);
    addLog(`AI Scanning ${app.name} for hidden web endpoints...`);
    
    try {
      const result = await analyzeAppMetadata(app.name, app.packageName);
      
      if (result.isWebWrapper && result.suggestedUrl) {
        addLog(`AI Unmasked: ${app.name} is a web-wrapper for ${result.suggestedUrl} (Confidence: ${Math.round(result.confidence * 100)}%)`);
        
        const updatedApps = device.installedApps.map(a => 
          a.id === app.id ? { ...a, type: 'web', webUrl: result.suggestedUrl } : a
        );
        
        const updatedDevice = { ...device, installedApps: updatedApps };
        await setDoc(doc(db, 'devices', user.uid), updatedDevice);
        setDevice(updatedDevice);
        setActiveApp({ ...app, type: 'web', webUrl: result.suggestedUrl });
      } else {
        addLog(`AI Scan Complete: ${app.name} appears to be a native binary. No web endpoints found.`);
        alert("AI Scan: This app appears to be a native binary. No web endpoints were detected.");
      }
    } catch (err) {
      addLog(`AI Analysis Error: ${err}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    let unsubscribeDevice: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      if (currentUser) {
        addLog(`User ${currentUser.displayName} authenticated.`);
        
        // Sync user profile
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            const isPrimaryUser = currentUser.email === 'djklmr2024@gmail.com';
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              displayName: currentUser.displayName || 'User',
              email: currentUser.email || '',
              photoURL: currentUser.photoURL || '',
              createdAt: Date.now(),
              isDj: isPrimaryUser,
              arkaiosId: isPrimaryUser ? 'ARK-00PI-GLKE-NL02' : undefined,
              digitalName: isPrimaryUser ? 'djklmr' : undefined
            };
            await setDoc(userRef, newProfile);
            setUserProfile(newProfile);
          } else {
            const profileData = userSnap.data() as UserProfile;
            // Auto-update primary user if fields are missing
            if (currentUser.email === 'djklmr2024@gmail.com' && !profileData.arkaiosId) {
              const updatedProfile = { 
                ...profileData, 
                isDj: true, 
                arkaiosId: 'ARK-00PI-GLKE-NL02', 
                digitalName: 'djklmr' 
              };
              await setDoc(userRef, updatedProfile);
              setUserProfile(updatedProfile);
            } else {
              setUserProfile(profileData);
            }
          }
        } catch (err) {
          addLog("Error syncing user profile: " + err);
        }

        // Sync or create virtual device
        const deviceRef = doc(db, 'devices', currentUser.uid);
        unsubscribeDevice = onSnapshot(deviceRef, (docSnap) => {
          if (docSnap.exists()) {
            const deviceData = docSnap.data() as VirtualDevice;
            
            // Ensure Files and Browser apps are present for existing users
            let updatedApps = [...deviceData.installedApps];
            let needsUpdate = false;

            const hasFilesApp = updatedApps.some(a => a.packageName === 'com.android.documentsui');
            if (!hasFilesApp) {
              updatedApps.push({ id: '4', name: 'Files', packageName: 'com.android.documentsui', icon: 'Folder', version: '1.0', status: 'stopped', lastUsed: Date.now() });
              needsUpdate = true;
            }

            const hasDjPortal = updatedApps.some(a => a.packageName === 'com.arkaios.djportal');
            if (!hasDjPortal) {
              updatedApps.push({ id: '5', name: 'DJ Portal', packageName: 'com.arkaios.djportal', icon: 'Music', version: '1.0', status: 'stopped', lastUsed: Date.now() });
              needsUpdate = true;
            }

            const hasSysInfo = updatedApps.some(a => a.packageName === 'com.arkaios.sysinfo');
            if (!hasSysInfo) {
              updatedApps.push({ id: '6', name: 'System Info', packageName: 'com.arkaios.sysinfo', icon: 'Cpu', version: '1.0', status: 'stopped', lastUsed: Date.now() });
              needsUpdate = true;
            }

            const hasWebRtcHub = updatedApps.some(a => a.packageName === 'com.arkaios.webrtc');
            if (!hasWebRtcHub) {
              updatedApps.push({ id: '7', name: 'Streaming Hub', packageName: 'com.arkaios.webrtc', icon: 'Tv', version: '1.0', status: 'stopped', lastUsed: Date.now() });
              needsUpdate = true;
            }

            const hasApktool = updatedApps.some(a => a.packageName === 'com.arkaios.apktool');
            if (!hasApktool) {
              updatedApps.push({ id: '8', name: 'Apktool Studio', packageName: 'com.arkaios.apktool', icon: 'Wrench', version: '1.0', status: 'stopped', lastUsed: Date.now() });
              needsUpdate = true;
            }

            const browserApp = updatedApps.find(a => a.packageName === 'com.android.browser');
            if (!browserApp) {
              updatedApps.push({ id: '3', name: 'Browser', packageName: 'com.android.browser', icon: 'Globe', version: '1.0', status: 'stopped', lastUsed: Date.now(), type: 'web', webUrl: 'https://www.google.com' });
              needsUpdate = true;
            } else if (!browserApp.type) {
              // Update existing browser to be web-enabled
              const index = updatedApps.findIndex(a => a.packageName === 'com.android.browser');
              updatedApps[index] = { ...browserApp, type: 'web', webUrl: 'https://www.google.com' };
              needsUpdate = true;
            }

            if (needsUpdate) {
              setDoc(deviceRef, { ...deviceData, installedApps: updatedApps });
            }

            // Ensure orientation field is present for existing users
            if (!deviceData.orientation) {
              setDoc(deviceRef, { ...deviceData, orientation: 'portrait' });
            }

            setDevice(deviceData);
          } else {
            const initialDevice: VirtualDevice = {
              id: currentUser.uid,
              userId: currentUser.uid,
              model: 'SAI-GAI-NAI X1',
              osVersion: 'Android 14 (Simulated)',
              battery: 85,
              isLocked: true,
              installedApps: [
                { id: '1', name: 'Settings', packageName: 'com.android.settings', icon: 'Settings', version: '1.0', status: 'stopped', lastUsed: Date.now() },
                { id: '2', name: 'Terminal', packageName: 'com.android.terminal', icon: 'Terminal', version: '1.0', status: 'stopped', lastUsed: Date.now() },
                { id: '3', name: 'Browser', packageName: 'com.android.browser', icon: 'Globe', version: '1.0', status: 'stopped', lastUsed: Date.now(), type: 'web', webUrl: 'https://www.google.com' },
                { id: '4', name: 'Files', packageName: 'com.android.documentsui', icon: 'Folder', version: '1.0', status: 'stopped', lastUsed: Date.now() },
                { id: '5', name: 'DJ Portal', packageName: 'com.arkaios.djportal', icon: 'Music', version: '1.0', status: 'stopped', lastUsed: Date.now() },
                { id: '6', name: 'System Info', packageName: 'com.arkaios.sysinfo', icon: 'Cpu', version: '1.0', status: 'stopped', lastUsed: Date.now() },
                { id: '7', name: 'Streaming Hub', packageName: 'com.arkaios.webrtc', icon: 'Tv', version: '1.0', status: 'stopped', lastUsed: Date.now() },
                { id: '8', name: 'Apktool Studio', packageName: 'com.arkaios.apktool', icon: 'Wrench', version: '1.0', status: 'stopped', lastUsed: Date.now() }
              ],
              screenBrightness: 100,
              volume: 70,
              formFactor: 'phone',
              orientation: 'portrait'
            };
            setDoc(deviceRef, initialDevice);
            addLog("New virtual device provisioned for user.");
          }
        }, (err) => {
          addLog("Device sync error: " + err);
        });
      } else {
        if (unsubscribeDevice) {
          unsubscribeDevice();
          unsubscribeDevice = null;
        }
        setDevice(null);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDevice) unsubscribeDevice();
    };
  }, []);

  useEffect(() => {
    if (!device || !user) return;

    const params = new URLSearchParams(window.location.search);
    const targetApp = params.get('app');
    const targetPackage = params.get('package');

    if (targetApp && targetPackage) {
      const isInstalled = device.installedApps.some(a => a.packageName === targetPackage);
      if (!isInstalled) {
        addLog(`Analyzing remote APK: ${targetPackage}...`);
        const newApp: VirtualApp = {
          id: Math.random().toString(36).substring(7),
          name: targetApp,
          packageName: targetPackage,
          icon: 'Package',
          version: '1.0.0-remote',
          status: 'installed',
          lastUsed: Date.now()
        };
        const updatedApps = [...device.installedApps, newApp];
        setDoc(doc(db, 'devices', user.uid), { ...device, installedApps: updatedApps });
        addLog(`Auto-installed remote app: ${targetApp}`);
      }
    }
  }, [device?.id, user?.uid]);

  const handleBoot = () => {
    setIsBooting(true);
    addLog("Initializing SAI-GAI-NAI Kernel...");
    setTimeout(() => {
      addLog("Loading System UI...");
      setTimeout(() => {
        addLog("Android OS Deployed successfully.");
        setIsBooting(false);
        if (device) {
          setDoc(doc(db, 'devices', user!.uid), { ...device, isLocked: false });
          
          // Check for auto-launch after boot
          const params = new URLSearchParams(window.location.search);
          const targetPackage = params.get('package');
          if (targetPackage) {
            const appToLaunch = device.installedApps.find(a => a.packageName === targetPackage);
            if (appToLaunch) {
              setActiveApp(appToLaunch);
              addLog(`Auto-launching ${appToLaunch.name}...`);
            }
          }
        }
      }, 2000);
    }, 1500);
  };

  const installAPK = (name: string, packageName?: string, version?: string) => {
    if (!device || !user) return;
    const newApp: VirtualApp = {
      id: Math.random().toString(36).substring(7),
      name,
      packageName: packageName || `com.user.${name.toLowerCase().replace(/\s+/g, '.')}`,
      icon: 'Package',
      version: version || '1.0.0-apk',
      status: 'installed',
      lastUsed: Date.now()
    };
    const updatedApps = [...device.installedApps, newApp];
    setDoc(doc(db, 'devices', user.uid), { ...device, installedApps: updatedApps });
    addLog(`APK "${name}" (${newApp.packageName}) installed successfully.`);
    
    // Automatically launch the app after installation
    setActiveApp(newApp);
    addLog(`Launching ${name}...`);
  };

  const buildCapacitorApp = async (name: string, url: string) => {
    if (!device || !user) return;
    setIsBuilding(true);
    setBuildProgress(0);
    addLog(`Initializing Capacitor Build Engine for: ${name}`);
    
    const steps = [
      "Creating project structure...",
      "Adding Android platform...",
      "Injecting Capacitor runtime...",
      "Configuring WebView for: " + url,
      "Generating APK manifest...",
      "Compiling native bridges...",
      "Signing APK package..."
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 600));
      setBuildProgress(((i + 1) / steps.length) * 100);
      addLog(steps[i]);
    }

    const newApp: VirtualApp = {
      id: Math.random().toString(36).substring(7),
      name,
      packageName: `io.capacitor.${name.toLowerCase().replace(/\s+/g, '.')}`,
      icon: 'Globe',
      version: '1.0.0-cap',
      status: 'installed',
      lastUsed: Date.now(),
      type: 'web',
      webUrl: url
    };

    const updatedApps = [...device.installedApps, newApp];
    await setDoc(doc(db, 'devices', user.uid), { ...device, installedApps: updatedApps });
    
    // Trigger automatic download of the Virtual APK (for emulator)
    const virtualBlob = new Blob([
      `SAI-GAI-NAI Virtual APK Package\n`,
      `------------------------------\n`,
      `App Name: ${name}\n`,
      `Package: ${newApp.packageName}\n`,
      `Target URL: ${url}\n`,
      `Build ID: ${newApp.id}\n`,
      `Build Date: ${new Date().toLocaleString()}\n`,
      `Status: SIGNED_EMULATOR\n`,
      `------------------------------\n`,
      `This is a Virtual APK designed for the SAI-GAI-NAI Web Emulator.\n`,
      `To generate a REAL binary APK for Android devices, use the "Export Native Source" option.`
    ], { type: 'application/vnd.android.package-archive' });
    
    const vUrl = window.URL.createObjectURL(virtualBlob);
    const vLink = document.createElement('a');
    vLink.href = vUrl;
    vLink.download = `${name.replace(/\s+/g, '_')}_virtual.apk`;
    document.body.appendChild(vLink);
    vLink.click();
    document.body.removeChild(vLink);
    window.URL.revokeObjectURL(vUrl);

    setIsBuilding(false);
    addLog(`Virtual APK "${name}" deployed to emulator and downloaded.`);
  };

  const downloadNativeSource = (name: string, url: string) => {
    const capacitorConfig = {
      appId: `io.capacitor.${name.toLowerCase().replace(/\s+/g, '.')}`,
      appName: name,
      webDir: 'www',
      server: {
        url: url,
        allowNavigation: [new URL(url).hostname]
      }
    };

    const packageJson = {
      name: name.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      dependencies: {
        "@capacitor/android": "^5.0.0",
        "@capacitor/core": "^5.0.0"
      },
      devDependencies: {
        "@capacitor/cli": "^5.0.0"
      }
    };

    const readme = `# Native Android Build Guide for ${name}
1. Install Node.js and Android Studio.
2. Run \`npm install\`.
3. Run \`npx cap add android\`.
4. Run \`npx cap open android\`.
5. In Android Studio, click "Build" > "Build Bundle(s) / APK(s)" > "Build APK(s)".

Your real .apk will be generated in \`android/app/build/outputs/apk/debug/app-debug.apk\`.`;

    const sourceContent = `
--- CAPACITOR.CONFIG.JSON ---
${JSON.stringify(capacitorConfig, null, 2)}

--- PACKAGE.JSON ---
${JSON.stringify(packageJson, null, 2)}

--- README.MD ---
${readme}
    `;

    const blob = new Blob([sourceContent], { type: 'text/plain' });
    const dUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = dUrl;
    link.download = `${name.replace(/\s+/g, '_')}_Native_Source.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(dUrl);
    addLog(`Exported Native Source for ${name}. Use this to build a real .apk.`);
  };

  const toggleFormFactor = () => {
    if (!device || !user) return;
    const newFactor = device.formFactor === 'tablet' ? 'phone' : 'tablet';
    setDoc(doc(db, 'devices', user.uid), { ...device, formFactor: newFactor });
    addLog(`Device form factor changed to: ${newFactor}`);
  };

  const toggleOrientation = () => {
    if (!device || !user) return;
    const newOrientation = device.orientation === 'portrait' ? 'landscape' : 'portrait';
    setDoc(doc(db, 'devices', user.uid), { ...device, orientation: newOrientation });
    addLog(`Orientation changed to: ${newOrientation}`);
  };

  const toggleFullscreen = () => {
    const elem = document.getElementById('emulator-frame');
    if (!elem) return;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch(err => {
        addLog(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const downloadNativeBridge = (app: VirtualApp) => {
    const deepLink = `${window.location.origin}${window.location.pathname}?app=${encodeURIComponent(app.name)}&package=${encodeURIComponent(app.packageName)}`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>SAI-GAI-NAI Bridge: ${app.name}</title>
        <style>
          body { background: #000; color: #fff; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .btn { background: #fff; color: #000; padding: 15px 30px; border-radius: 50px; text-decoration: none; font-weight: bold; margin-top: 20px; }
        </style>
      </head>
      <body>
        <h1>SAI-GAI-NAI Native Bridge</h1>
        <p>Connecting to virtual environment for: <strong>${app.name}</strong></p>
        <a href="${deepLink}" class="btn">Launch Emulator</a>
        <script>
          setTimeout(() => { window.location.href = "${deepLink}"; }, 1500);
        </script>
      </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SAI_GAI_NAI_${app.name.replace(/\s+/g, '_')}_Bridge.html`;
    a.click();
    addLog(`Generated Native Bridge for ${app.name}`);
  };

  const generateDeepLink = () => {
    const name = (document.getElementById('deep-app-name') as HTMLInputElement).value;
    const pkg = (document.getElementById('deep-package') as HTMLInputElement).value;
    if (name && pkg) {
      const url = `${window.location.origin}${window.location.pathname}?app=${encodeURIComponent(name)}&package=${encodeURIComponent(pkg)}`;
      setDeepLinkUrl(url);
      navigator.clipboard.writeText(url);
      addLog(`Generated deep link for ${name}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-white font-mono text-xl"
        >
          SAI-GAI-NAI DEPLOYING...
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4 overflow-hidden relative">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="z-10 text-center max-w-2xl"
        >
          <div className="flex justify-center mb-8">
            <div className="p-4 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl shadow-2xl">
              <Cpu className="w-16 h-16 text-blue-400" />
            </div>
          </div>
          <h1 className="text-6xl font-bold tracking-tighter mb-4 bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
            SAI-GAI-NAI
          </h1>
          <p className="text-xl text-white/60 mb-12 font-light leading-relaxed">
            The next-generation Android Web Emulator & APK Testing Environment. 
            Real-time simulation, cloud persistence, and enterprise connectivity.
          </p>
          
          <button 
            onClick={loginWithGoogle}
            className="group relative px-8 py-4 bg-white text-black rounded-full font-semibold text-lg flex items-center gap-3 hover:bg-white/90 transition-all active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.2)]"
          >
            <LogIn className="w-5 h-5" />
            Sign in with Google
            <div className="absolute inset-0 rounded-full border border-white/50 group-hover:scale-110 transition-transform duration-500 opacity-0 group-hover:opacity-100" />
          </button>

          <div className="mt-24 grid grid-cols-3 gap-8 text-left">
            {[
              { icon: ShieldCheck, title: "Secure", desc: "Google Auth & Firestore" },
              { icon: Globe, title: "Web-Native", desc: "No installation required" },
              { icon: Database, title: "Persistent", desc: "Save states & app data" }
            ].map((feature, i) => (
              <div key={i} className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                <feature.icon className="w-6 h-6 text-blue-400 mb-3" />
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-white/40">{feature.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <footer className="absolute bottom-8 text-white/20 text-xs font-mono tracking-widest uppercase">
          ecosistema regalado pro Arkaios God "SAI-GAI-NAI" a Google
        </footer>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white font-mono text-sm animate-pulse">
          PROVISIONING VIRTUAL DEVICE...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col lg:flex-row p-4 lg:p-8 gap-8 font-sans selection:bg-blue-500/30">
      {/* Sidebar / Controls */}
      <div className="w-full lg:w-80 flex flex-col gap-6">
        <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
          <div className="flex items-center gap-4 mb-6">
            <img src={user.photoURL || ''} className="w-12 h-12 rounded-2xl border border-white/10" />
            <div>
              <h2 className="font-bold text-lg leading-tight">{user.displayName}</h2>
              <p className="text-xs text-white/40 font-mono uppercase tracking-tighter">Developer ID: {user.uid.slice(0, 8)}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full py-3 bg-white/5 hover:bg-red-500/10 hover:text-red-400 border border-white/10 rounded-xl transition-all flex items-center justify-center gap-2 text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Terminate Session
          </button>
        </div>

        <div className="flex-1 p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-mono uppercase tracking-widest text-white/40">System Logs</h3>
            <Terminal className="w-4 h-4 text-white/20" />
          </div>
          <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-1 text-blue-400/80 scrollbar-hide">
            {logs.map((log, i) => (
              <div key={i} className="opacity-80 hover:opacity-100 transition-opacity">{log}</div>
            ))}
          </div>
        </div>

        <div className="flex-1 p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-mono uppercase tracking-widest text-white/40">Cloud Storage / My Apps</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  const filesApp = device?.installedApps.find(a => a.packageName === 'com.android.documentsui');
                  if (filesApp) setActiveApp(filesApp);
                }}
                className="p-1.5 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                title="Open File Manager"
              >
                <HardDrive className="w-4 h-4" />
              </button>
              <HardDrive className="w-4 h-4 text-white/20" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
            {device?.installedApps?.filter(a => a.packageName.includes('io.capacitor') || a.version.includes('apk')).map(app => (
              <div key={app.id} className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between group hover:bg-white/10 transition-all">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
                    {app.type === 'web' ? <Globe className="w-4 h-4 text-purple-400" /> : <Package className="w-4 h-4 text-blue-400" />}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-bold truncate">{app.name}</p>
                    <p className="text-[8px] text-white/40 truncate">{app.packageName}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setActiveApp(app)}
                    className="p-1.5 hover:bg-green-500/20 text-green-400 rounded-lg"
                    title="Launch"
                  >
                    <Play className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={() => {
                      const blob = new Blob([
                        `SAI-GAI-NAI Virtual APK Package\n`,
                        `------------------------------\n`,
                        `App Name: ${app.name}\n`,
                        `Package: ${app.packageName}\n`,
                        `Version: ${app.version}\n`,
                        `Build Date: ${new Date(app.lastUsed).toLocaleString()}\n`,
                        `------------------------------\n`,
                        `This is a simulated APK package for the SAI-GAI-NAI ecosystem.`
                      ], { type: 'application/vnd.android.package-archive' });
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `${app.name.replace(/\s+/g, '_')}.apk`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);
                      addLog(`Downloading APK: ${app.name}`);
                    }}
                    className="p-1.5 hover:bg-purple-500/20 text-purple-400 rounded-lg"
                    title="Download APK"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={() => downloadNativeBridge(app)}
                    className="p-1.5 hover:bg-blue-500/20 text-blue-400 rounded-lg"
                    title="Download Native Bridge"
                  >
                    <DownloadCloud className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
            {(!device?.installedApps || !device.installedApps.some(a => a.packageName.includes('io.capacitor') || a.version.includes('apk'))) && (
              <p className="text-[10px] text-white/20 text-center py-8 italic">No apps in your cloud space yet.</p>
            )}
          </div>
        </div>

        <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
          <h3 className="text-xs font-mono uppercase tracking-widest text-white/40 mb-4">APK Sideload</h3>
          <label className="border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group">
            <UploadCloud className="w-8 h-8 text-white/20 group-hover:text-blue-400 transition-colors" />
            <p className="text-xs text-white/40 text-center">Click to upload and deploy APK</p>
            <input 
              type="file" 
              accept=".apk" 
              className="hidden" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const name = file.name.replace('.apk', '');
                  installAPK(name);
                }
              }}
            />
          </label>
        </div>

        <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
          <h3 className="text-xs font-mono uppercase tracking-widest text-white/40 mb-4">Native Client & Interconnection</h3>
          <div className="space-y-3">
            <p className="text-[10px] text-white/40 leading-relaxed">
              To run the system in <strong>Native Mode</strong> on Windows, use the Electron wrapper. 
              This enables local filesystem access and deep-link rehydration.
            </p>
            <button 
              onClick={() => {
                const readmeContent = `Consulte el archivo README.md en la raíz del proyecto para ver los pasos detallados sobre cómo crear el instalable de Windows (.exe) usando Electron y cómo configurar la interconexión con Firebase.`;
                alert(readmeContent);
              }}
              className="w-full py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl text-[10px] font-bold hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2"
            >
              <MonitorSmartphone className="w-3 h-3" /> View Setup Guide
            </button>
            <div className="p-3 bg-black/40 rounded-xl border border-white/5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[8px] text-white/20 uppercase font-mono">Sync Status</span>
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              </div>
              <p className="text-[9px] text-green-400/60 font-mono">Connected to Google Cloud</p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
          <h3 className="text-xs font-mono uppercase tracking-widest text-white/40 mb-4">Capacitor Build Engine</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <input 
                id="cap-app-name"
                type="text" 
                placeholder="App Name" 
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] focus:border-blue-500/50 outline-none"
              />
              <input 
                id="cap-url"
                type="text" 
                placeholder="https://example.com" 
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] focus:border-blue-500/50 outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <button 
                  disabled={isBuilding}
                  onClick={() => {
                    const name = (document.getElementById('cap-app-name') as HTMLInputElement).value;
                    const url = (document.getElementById('cap-url') as HTMLInputElement).value;
                    if (name && url) buildCapacitorApp(name, url);
                  }}
                  className="py-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl text-[10px] font-bold hover:bg-purple-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <Monitor className="w-3 h-3" />
                  {isBuilding ? 'Building...' : 'Build Virtual APK'}
                </button>
                <button 
                  onClick={() => {
                    const name = (document.getElementById('cap-app-name') as HTMLInputElement).value;
                    const url = (document.getElementById('cap-url') as HTMLInputElement).value;
                    if (name && url) downloadNativeSource(name, url);
                  }}
                  className="py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl text-[10px] font-bold hover:bg-blue-500/20 transition-all flex items-center justify-center gap-1"
                >
                  <Code2 className="w-3 h-3" />
                  Export Native Source
                </button>
              </div>
              <p className="text-[8px] text-white/20 text-center italic mt-1">
                Virtual APKs run in the emulator. Native Source is for real Android Studio builds.
              </p>
            </div>
            {isBuilding && (
              <div className="space-y-1">
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${buildProgress}%` }}
                    className="h-full bg-purple-500"
                  />
                </div>
                <p className="text-[8px] text-purple-400/60 font-mono text-center">Compiling Native Assets...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Emulator View */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        <div className="absolute inset-0 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
        
        {/* Device Toggles */}
        <div className="mb-4 flex gap-2 p-1 bg-white/5 border border-white/10 rounded-full backdrop-blur-xl z-20">
          <div className="flex gap-1 border-r border-white/10 pr-1 mr-1">
            <button 
              onClick={toggleOrientation}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white"
              title="Toggle Orientation"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={toggleFullscreen}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white"
              title="Toggle Fullscreen"
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>
          </div>
          <button 
            onClick={toggleFormFactor}
            className={cn(
              "px-4 py-1.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-2",
              device?.formFactor !== 'tablet' ? "bg-white text-black" : "text-white/40 hover:text-white"
            )}
          >
            <Smartphone className="w-3 h-3" /> Phone
          </button>
          <button 
            onClick={toggleFormFactor}
            className={cn(
              "px-4 py-1.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-2",
              device?.formFactor === 'tablet' ? "bg-white text-black" : "text-white/40 hover:text-white"
            )}
          >
            <Monitor className="w-3 h-3" /> Tablet
          </button>
        </div>

        {/* Phone/Tablet Frame */}
        <motion.div 
          id="emulator-frame"
          animate={{ 
            width: device?.formFactor === 'tablet' 
              ? (device?.orientation === 'landscape' ? 850 : 600) 
              : (device?.orientation === 'landscape' ? 650 : 320),
            height: device?.formFactor === 'tablet' 
              ? (device?.orientation === 'landscape' ? 550 : 800) 
              : (device?.orientation === 'landscape' ? 320 : 650)
          }}
          className="relative bg-[#1a1a1a] rounded-[3rem] border-[8px] border-[#2a2a2a] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col transition-all duration-500"
        >
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#2a2a2a] rounded-b-2xl z-50 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-black rounded-full" />
            <div className="w-8 h-1 bg-black/50 rounded-full" />
          </div>

          {/* Screen Content */}
          <div className="flex-1 bg-black relative overflow-hidden">
            {device?.isLocked ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                {isBooting ? (
                  <div className="flex flex-col items-center gap-4">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full"
                    />
                    <p className="text-xs font-mono text-blue-400">Booting System...</p>
                  </div>
                ) : (
                  <>
                    <Smartphone className="w-16 h-16 text-white/10 mb-6" />
                    <h4 className="text-xl font-bold mb-2">{device.model}</h4>
                    <p className="text-sm text-white/40 mb-8">SAI-GAI-NAI Virtual Environment</p>
                    <button 
                      onClick={handleBoot}
                      className="px-6 py-2 bg-white text-black rounded-full font-bold text-sm hover:bg-white/90 active:scale-95 transition-all"
                    >
                      Power On
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col">
                {/* Status Bar */}
                <div className="h-10 flex items-center justify-between px-6 pt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="w-3 h-3 text-white/60" />
                    <Activity className="w-3 h-3 text-white/60" />
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-2 border border-white/40 rounded-[1px] relative">
                        <div className="absolute inset-0 bg-white/80" style={{ width: `${device.battery}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main OS View */}
                <div className="flex-1 p-4 relative">
                  <AnimatePresence mode="wait">
                    {isBooting ? (
                      <motion.div 
                        key="boot"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[60] bg-black flex flex-col items-center justify-center p-8 font-mono"
                      >
                        <div className="w-16 h-16 mb-8 relative">
                          <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full" />
                          <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin" />
                        </div>
                        <div className="w-full max-w-[200px] space-y-1">
                          {bootLog.map((log, i) => (
                            <div key={i} className="text-[8px] text-blue-400/80 animate-in fade-in slide-in-from-bottom-1">
                              {log}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ) : isAppSwitcherOpen ? (
                      <motion.div 
                        key="app-switcher"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-xl z-50 p-6 flex flex-col"
                      >
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-xs font-mono text-white/40 uppercase tracking-widest">Recent Apps</h4>
                          <button 
                            onClick={() => setIsAppSwitcherOpen(false)}
                            className="text-[10px] text-blue-400 font-bold"
                          >
                            Close
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-4">
                          {device.installedApps.slice(0, 5).map((app) => (
                            <div 
                              key={app.id}
                              className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:bg-white/10 transition-all cursor-pointer"
                              onClick={() => {
                                bootApp(app);
                                setIsAppSwitcherOpen(false);
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-black/40 rounded-xl flex items-center justify-center border border-white/5">
                                  {app.icon === 'Settings' && <Settings className="w-5 h-5 text-white/40" />}
                                  {app.icon === 'Terminal' && <Terminal className="w-5 h-5 text-white/40" />}
                                  {app.icon === 'Globe' && <Globe className="w-5 h-5 text-white/40" />}
                                  {app.icon === 'Folder' && <HardDrive className="w-5 h-5 text-white/40" />}
                                  {app.icon === 'Package' && <Package className="w-5 h-5 text-blue-400/40" />}
                                  {app.icon === 'Music' && <Music className="w-5 h-5 text-purple-400/40" />}
                                  {app.icon === 'Cpu' && <Cpu className="w-5 h-5 text-emerald-400/40" />}
                                  {app.icon === 'Tv' && <Tv className="w-5 h-5 text-cyan-400/40" />}
                                  {app.icon === 'Wrench' && <Wrench className="w-5 h-5 text-orange-400/40" />}
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-white flex items-center gap-2">
                                    {app.name}
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                  </div>
                                  <div className="text-[8px] text-white/20 font-mono">{app.packageName}</div>
                                </div>
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addLog(`Closed ${app.name} from switcher.`);
                                }}
                                className="p-2 hover:bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-white/20 hover:text-red-400" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ) : activeApp ? (
                      <motion.div 
                        key={activeApp.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute inset-0 bg-[#121212] z-40 flex flex-col"
                      >
                        <div className="h-12 flex items-center justify-between px-4 border-b border-white/5">
                          <div className="flex items-center gap-2">
                            {activeApp.icon === 'Folder' && <HardDrive className="w-4 h-4 text-blue-400" />}
                            {activeApp.icon === 'Settings' && <Settings className="w-4 h-4 text-zinc-400" />}
                            {activeApp.icon === 'Terminal' && <Terminal className="w-4 h-4 text-amber-400" />}
                            {activeApp.icon === 'Globe' && <Globe className="w-4 h-4 text-cyan-400" />}
                            {activeApp.icon === 'Package' && <Package className="w-4 h-4 text-sky-400" />}
                            {activeApp.icon === 'Music' && <Music className="w-4 h-4 text-purple-400" />}
                            {activeApp.icon === 'Cpu' && <Cpu className="w-4 h-4 text-emerald-400" />}
                            {activeApp.icon === 'Tv' && <Tv className="w-4 h-4 text-rose-400" />}
                            {activeApp.icon === 'Wrench' && <Wrench className="w-4 h-4 text-orange-400" />}
                            <span className="text-xs font-bold">{activeApp.name}</span>
                          </div>
                          <button onClick={() => setActiveApp(null)} className="p-1 hover:bg-white/5 rounded-lg">
                            <Square className="w-4 h-4 text-white/40" />
                          </button>
                        </div>
                        
                        {activeApp.packageName === 'com.android.documentsui' ? (
                          <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-mono text-white/40 uppercase tracking-widest">Internal Storage</h4>
                              <div className="flex gap-2">
                                <label className="cursor-pointer p-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl text-[10px] font-bold hover:bg-blue-500/20 transition-all flex items-center gap-2">
                                  <PlusCircle className="w-3 h-3" />
                                  Upload APK
                                  <input 
                                    type="file" 
                                    accept=".apk" 
                                    className="hidden" 
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        addLog(`Deep scanning APK: ${file.name}...`);
                                        try {
                                          const metadata = await parseApk(file);
                                          installAPK(metadata.name, metadata.packageName, metadata.version);
                                          addLog(`Analysis complete. Package: ${metadata.packageName}`);
                                          if (metadata.permissions.length > 0) {
                                            addLog(`Found ${metadata.permissions.length} permissions in manifest.`);
                                          }
                                        } catch (err) {
                                          console.error(err);
                                          const name = file.name.replace('.apk', '');
                                          installAPK(name);
                                          addLog(`Basic installation for "${file.name}" (Deep scan failed).`);
                                        }
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                              {device.installedApps.map(app => (
                                <div key={app.id} className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
                                      <Package className="w-4 h-4 text-blue-400/60" />
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-bold">{app.name}</p>
                                      <p className="text-[8px] text-white/40">{app.packageName}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUninstall(app);
                                      }}
                                      className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                      title="Uninstall"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                    <button 
                                      onClick={() => setActiveApp(app)}
                                      className="p-2 hover:bg-green-500/20 text-green-400 rounded-lg"
                                    >
                                      <Play className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="mt-auto p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl text-center">
                              <p className="text-[10px] text-blue-400/60 italic">
                                Use the "Upload APK" button to sideload native packages into the SAI-GAI-NAI environment.
                              </p>
                            </div>
                          </div>
                        ) : activeApp.packageName === 'com.android.settings' ? (
                          <div className="flex-1 flex flex-col p-6 text-left overflow-y-auto custom-scrollbar">
                            <h3 className="text-xl font-black text-white mb-6">System Settings</h3>
                            
                            <div className="space-y-6">
                              <div className="space-y-2">
                                <label className="text-[10px] text-white/40 uppercase font-bold">Runtime Engine (ARC Legacy Support)</label>
                                <div className="grid grid-cols-3 gap-2">
                                  {['HLE', 'ARC', 'VULKAN'].map((engine) => (
                                    <button
                                      key={engine}
                                      onClick={() => setRuntimeEngine(engine as any)}
                                      className={cn(
                                        "py-2 rounded-xl text-[10px] font-bold border transition-all",
                                        runtimeEngine === engine 
                                          ? "bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/20" 
                                          : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                      )}
                                    >
                                      {engine}
                                    </button>
                                  ))}
                                </div>
                                <p className="text-[8px] text-white/20 italic">
                                  ARC mode attempts to use the legacy Chrome Native Client bridge.
                                </p>
                              </div>

                              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                                <div className="flex items-center justify-between mb-4">
                                  <span className="text-xs font-bold text-white">Developer Options</span>
                                  <div className="w-8 h-4 bg-blue-500 rounded-full relative">
                                    <div className="absolute right-1 top-1 w-2 h-2 bg-white rounded-full" />
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-white/60">USB Debugging</span>
                                    <span className="text-[10px] text-blue-400">Enabled</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-white/60">Force GPU Rendering</span>
                                    <span className="text-[10px] text-white/20">Disabled</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : activeApp.packageName === 'com.arkaios.sysinfo' ? (
                          <div className="flex-1 flex flex-col p-6 text-left overflow-y-auto custom-scrollbar font-mono">
                            <div className="flex items-center gap-3 mb-6">
                              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                                <Cpu className="w-6 h-6 text-blue-400" />
                              </div>
                              <div>
                                <h3 className="text-lg font-bold text-white">System Architecture</h3>
                                <p className="text-[10px] text-white/40 uppercase tracking-widest">SAI-GAI-NAI Kernel v1.0</p>
                              </div>
                            </div>

                            <div className="space-y-6">
                              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                                <h4 className="text-xs font-bold text-blue-400 mb-2 uppercase">Emulation Level: HLE</h4>
                                <p className="text-[10px] text-white/60 leading-relaxed">
                                  This system operates as a <strong>High-Level Emulator (HLE)</strong>. 
                                  It simulates Android APIs and behaviors using WebGL, Vulkan-JS, and React layers.
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
                                  <div className="text-[8px] text-white/20 uppercase mb-1">Execution Mode</div>
                                  <div className="text-[10px] text-green-400 font-bold">VIRTUALIZED</div>
                                </div>
                                <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
                                  <div className="text-[8px] text-white/20 uppercase mb-1">Binary Support</div>
                                  <div className="text-[10px] text-yellow-400 font-bold">SIMULATED</div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <h4 className="text-xs font-bold text-white/80 uppercase">How it works:</h4>
                                <ul className="space-y-2">
                                  {[
                                    { t: "Virtual APKs", d: "Shortcuts that bridge web content into the SAI-GAI-NAI runtime." },
                                    { t: "Native Sideload", d: "Analyzes APK manifests to simulate app dashboards and headless logic." },
                                    { t: "Native Source", d: "Real Capacitor/Android code for building binary .apk files in Android Studio." }
                                  ].map((item, i) => (
                                    <li key={i} className="flex gap-3 items-start">
                                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1 shrink-0" />
                                      <div>
                                        <div className="text-[10px] font-bold text-white">{item.t}</div>
                                        <div className="text-[9px] text-white/40">{item.d}</div>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl">
                                <div className="flex items-center gap-2 mb-2">
                                  <AlertCircle className="w-3 h-3 text-red-400" />
                                  <span className="text-[9px] text-red-400 font-bold uppercase">Important Note</span>
                                </div>
                                <p className="text-[9px] text-white/40 leading-relaxed italic">
                                  "This is a digital ecosystem for development and testing. It does not run a real Linux kernel or ART virtual machine. For real device testing, use the Exported Native Source."
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : activeApp.packageName === 'com.arkaios.djportal' ? (
                          <div className="flex-1 flex flex-col items-center justify-start p-4 text-center overflow-y-auto custom-scrollbar">
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-purple-500/20 mb-4">
                              <Music className="w-10 h-10 text-white" />
                            </div>
                            <h3 className="text-xl font-black text-white mb-1">DJ PORTAL</h3>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-6">Professional Verification</p>

                            {userProfile?.isDj ? (
                              <div className="w-full p-6 bg-green-500/10 border border-green-500/20 rounded-2xl flex flex-col items-center gap-4">
                                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20">
                                  <CheckCircle className="w-6 h-6 text-white" />
                                </div>
                                <div className="text-center">
                                  <h4 className="text-sm font-bold text-green-400">DJ PROFILE ACTIVE</h4>
                                  <p className="text-[10px] text-white/60 mt-1">Your identity has been verified by the Central IA Bank.</p>
                                </div>
                                <div className="w-full pt-4 border-t border-white/5 grid grid-cols-2 gap-2">
                                  <div className="text-left">
                                    <div className="text-[8px] text-white/40 uppercase">Status</div>
                                    <div className="text-[10px] text-white font-bold">Verified Professional</div>
                                  </div>
                                  <div className="text-left">
                                    <div className="text-[8px] text-white/40 uppercase">Tier</div>
                                    <div className="text-[10px] text-purple-400 font-bold">Elite DJ</div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="w-full space-y-4">
                                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left">
                                  <h5 className="text-[10px] font-bold text-white/80 uppercase mb-2">Verification Required</h5>
                                  <p className="text-[9px] text-white/60 leading-relaxed">
                                    To unlock professional DJ features, you must provide a valid <strong>Security Sticker URL</strong> generated by the Flow Diagram Creator.
                                  </p>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[10px] text-white/40 uppercase font-bold block text-left px-1">Sticker URL</label>
                                  <div className="relative">
                                    <input 
                                      type="text"
                                      value={stickerUrl}
                                      onChange={(e) => setStickerUrl(e.target.value)}
                                      placeholder="https://flow-diagram-creator.vercel.app/?mode=sticker&id=..."
                                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[11px] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-all"
                                    />
                                    <ShieldCheck className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                  </div>
                                </div>

                                <button 
                                  disabled={isValidating || !stickerUrl}
                                  onClick={handleStickerValidation}
                                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-black hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-purple-500/20"
                                >
                                  {isValidating ? (
                                    <>
                                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                      VALIDATING WITH IA BANK...
                                    </>
                                  ) : (
                                    <>
                                      <Activity className="w-4 h-4" />
                                      VERIFY CODE AUTHENTICITY
                                    </>
                                  )}
                                </button>

                                {validationResult && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cn(
                                      "p-4 rounded-2xl border text-left",
                                      validationResult.success ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"
                                    )}
                                  >
                                    <div className="flex items-start gap-3">
                                      {validationResult.success ? (
                                        <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                                      ) : (
                                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                      )}
                                      <div>
                                        <h5 className={cn("text-[11px] font-bold uppercase", validationResult.success ? "text-green-400" : "text-red-400")}>
                                          {validationResult.success ? "Validation Successful" : "Validation Failed"}
                                        </h5>
                                        <p className="text-[10px] text-white/60 mt-1 leading-relaxed">{validationResult.message}</p>
                                        
                                        {validationResult.success && (
                                          <button 
                                            onClick={handleDjActivation}
                                            className="mt-4 w-full py-2 bg-green-500 text-white rounded-lg text-[10px] font-black hover:bg-green-600 transition-all"
                                          >
                                            ACTIVATE DJ PROFILE NOW
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </div>
                            )}

                            <div className="mt-auto pt-8 w-full">
                              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-left">
                                <div className="flex items-center gap-2 mb-2">
                                  <Layers className="w-3 h-3 text-purple-400" />
                                  <span className="text-[8px] text-white/40 uppercase font-bold">Security Protocol</span>
                                </div>
                                <p className="text-[8px] text-white/30 leading-relaxed">
                                  All codes are integrated into the Central IA Bank as evidence. 
                                  The JSON Builder generates a unique signature that is verified through multi-layer security filters.
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : activeApp.packageName === 'com.arkaios.webrtc' ? (
                          <div className="flex-1 flex flex-col md:flex-row p-4 text-left overflow-y-auto md:overflow-hidden gap-4 custom-scrollbar bg-zinc-950 font-sans h-full">
                            {/* LEFT PANEL: Streaming Canvas */}
                            <div className="flex-1 flex flex-col gap-3 min-w-[300px] h-full md:overflow-y-auto">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Tv className="w-4 h-4 text-blue-400 animate-pulse" />
                                    CLOUD STREAMING HUB
                                  </h3>
                                  <p className="text-[9px] text-white/40 uppercase tracking-wider font-mono">WebRTC & noVNC Protocol Bridge</p>
                                </div>
                                <div className="flex gap-2 items-center">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[8px] font-mono font-bold flex items-center gap-1",
                                    webrtcIsConnected ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                                  )}>
                                    <span className={cn("w-1.5 h-1.5 rounded-full", webrtcIsConnected ? "bg-green-400 animate-pulse" : "bg-red-400")} />
                                    {webrtcIsConnected ? "STREAM LIVE" : "DISCONNECTED"}
                                  </span>
                                </div>
                              </div>

                              {/* Virtual Monitor / Iframe viewport */}
                              <div className="relative aspect-[9/16] max-h-[460px] mx-auto w-full max-w-[260px] bg-neutral-950 rounded-3xl border border-white/10 overflow-hidden flex flex-col shadow-2xl shadow-blue-500/5">
                                {webrtcIsConnected && webrtcUrl ? (
                                  <div className="flex-1 w-full h-full relative">
                                    <iframe 
                                      src={webrtcUrl} 
                                      className="w-full h-full border-none bg-black"
                                      title="Remote Android Stream"
                                      referrerPolicy="no-referrer"
                                    />
                                    {/* Overlay status */}
                                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-[8px] font-mono text-blue-400 pointer-events-none flex items-center gap-1">
                                      <Wifi className="w-2.5 h-2.5" />
                                      LATENCY: {webrtcLatency}ms
                                    </div>
                                  </div>
                                ) : webrtcIsConnected ? (
                                  /* Interactive simulated stream */
                                  <div className="flex-1 flex flex-col bg-[#121212] relative overflow-hidden group select-none">
                                    {/* App screen inside simulated stream */}
                                    <div className="flex-1 flex flex-col p-4 justify-between relative">
                                      {/* Android status bar inside */}
                                      <div className="flex justify-between items-center text-[8px] font-bold text-white/60">
                                        <span>12:00</span>
                                        <div className="flex gap-1 items-center">
                                          <Wifi className="w-2 h-2" />
                                          <span>LTE</span>
                                          <div className="w-3 h-1.5 border border-white/40 rounded-sm relative flex items-center px-0.5">
                                            <div className="w-full h-full bg-white/60" />
                                          </div>
                                        </div>
                                      </div>

                                      {/* Launcher Content */}
                                      <div className="flex-1 flex flex-col items-center justify-center gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/10 animate-bounce">
                                          <Smartphone className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="text-center space-y-1">
                                          <p className="text-xs font-black text-white tracking-wide">WebRTC-Android</p>
                                          <p className="text-[8px] font-mono text-green-400">FPS: {webrtcFps} | loss: 0%</p>
                                        </div>
                                        <div className="p-3 bg-black/60 rounded-xl border border-white/5 w-full text-[9px] font-mono text-white/60 text-left space-y-1">
                                          <div className="text-blue-400 font-bold">Container Details:</div>
                                          <div>OS: Android 13 (Docker x86)</div>
                                          <div>GLES version: 3.0 (vulkan)</div>
                                          <div>Resolution: 1080x1920</div>
                                        </div>
                                      </div>

                                      {/* Android Navigation bar inside */}
                                      <div className="flex justify-around items-center h-8 border-t border-white/5 text-white/40">
                                        <ChevronLeft className="w-4 h-4 cursor-pointer hover:text-white" />
                                        <Home className="w-3.5 h-3.5 cursor-pointer hover:text-white" />
                                        <Menu className="w-4 h-4 cursor-pointer hover:text-white" />
                                      </div>
                                    </div>
                                    {/* Remote overlay latency stats */}
                                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-[8px] font-mono text-blue-400 pointer-events-none flex items-center gap-1">
                                      <Wifi className="w-2.5 h-2.5 animate-pulse" />
                                      LATENCY: {webrtcLatency}ms
                                    </div>
                                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-[8px] font-mono text-green-400 pointer-events-none">
                                      {webrtcFps} FPS
                                    </div>
                                  </div>
                                ) : (
                                  /* Offline View */
                                  <div className="flex-1 flex flex-col items-center justify-center bg-[#09090b] p-6 text-center">
                                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                                      <Power className="w-5 h-5 text-white/20" />
                                    </div>
                                    <h4 className="text-xs font-bold text-white mb-1">Stream Offline</h4>
                                    <p className="text-[9px] text-white/40 mb-4 max-w-[180px] leading-relaxed">
                                      Connect your custom server or activate the simulated high-performance container.
                                    </p>
                                    <button
                                      onClick={handleConnectWebRtc}
                                      className="py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-[10px] shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                                    >
                                      <PlayCircle className="w-3.5 h-3.5" />
                                      ACTIVATE EMULATOR
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* External Controller Buttons */}
                              {webrtcIsConnected && (
                                <div className="flex justify-center gap-2">
                                  <button 
                                    onClick={() => handleDisconnectWebRtc()}
                                    className="py-1.5 px-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[9px] font-bold hover:bg-red-500/20 transition-all flex items-center gap-1"
                                  >
                                    <StopCircle className="w-3 h-3" />
                                    DISCONNECT
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setWebrtcLogs(prev => [...prev, `[USER] Triggered home button.`]);
                                      addLog("WebRTC: Sent Home keyevent.");
                                    }}
                                    className="py-1.5 px-3 bg-white/5 border border-white/10 text-white/60 rounded-xl text-[9px] font-bold hover:bg-white/10 transition-all"
                                  >
                                    HOME (ADB)
                                  </button>
                                  <button 
                                    onClick={() => {
                                      const key = prompt("Enter ADB text to send:");
                                      if (key) {
                                        setWebrtcLogs(prev => [...prev, `[USER] Sent text input: "${key}"`]);
                                        addLog(`WebRTC: Sent text input: ${key}`);
                                      }
                                    }}
                                    className="py-1.5 px-3 bg-white/5 border border-white/10 text-white/60 rounded-xl text-[9px] font-bold hover:bg-white/10 transition-all"
                                  >
                                    SEND TEXT
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* RIGHT PANEL: Settings, Logs, and Blueprint */}
                            <div className="flex-1 flex flex-col gap-3 min-w-[300px] h-full md:overflow-y-auto">
                              {/* Configuration & Connect */}
                              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                                <h4 className="text-xs font-bold text-white flex items-center gap-2 font-mono uppercase tracking-wider">
                                  <Settings className="w-3.5 h-3.5 text-blue-400" />
                                  CONNECTION GATEWAY
                                </h4>
                                <div className="space-y-1">
                                  <label className="text-[8px] font-mono text-white/40 uppercase tracking-wider block">Docker / noVNC Stream URL</label>
                                  <div className="flex gap-2">
                                    <input 
                                      type="text"
                                      value={webrtcUrl}
                                      onChange={(e) => setWebrtcUrl(e.target.value)}
                                      placeholder="e.g. http://localhost:6080/vnc.html"
                                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-mono text-white focus:outline-none focus:border-blue-500/50"
                                    />
                                    <button 
                                      onClick={webrtcIsConnected ? handleDisconnectWebRtc : handleConnectWebRtc}
                                      className={cn(
                                        "px-3 py-2 rounded-xl text-[10px] font-black tracking-wide transition-all",
                                        webrtcIsConnected 
                                          ? "bg-red-500 text-white" 
                                          : "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                      )}
                                    >
                                      {webrtcIsConnecting ? "CONNECTING..." : webrtcIsConnected ? "DISCONNECT" : "CONNECT"}
                                    </button>
                                  </div>
                                </div>
                                <p className="text-[8px] text-white/30 leading-normal italic">
                                  Leave the Stream URL blank to boot the fully simulated Android high-performance streaming container.
                                </p>
                              </div>

                              {/* TABS: Blueprints vs Console */}
                              <div className="flex-1 flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden min-h-[220px]">
                                <div className="flex border-b border-white/10">
                                  <button 
                                    onClick={() => setWebrtcActiveTab('dockerify')}
                                    className={cn(
                                      "flex-1 py-2 text-[9px] font-bold tracking-wider uppercase border-r border-white/10 transition-all",
                                      webrtcActiveTab === 'dockerify' ? "bg-white/5 text-blue-400" : "text-white/40 hover:text-white"
                                    )}
                                  >
                                    Dockerify
                                  </button>
                                  <button 
                                    onClick={() => setWebrtcActiveTab('google')}
                                    className={cn(
                                      "flex-1 py-2 text-[9px] font-bold tracking-wider uppercase border-r border-white/10 transition-all",
                                      webrtcActiveTab === 'google' ? "bg-white/5 text-blue-400" : "text-white/40 hover:text-white"
                                    )}
                                  >
                                    Google RTC
                                  </button>
                                  <button 
                                    onClick={() => setWebrtcActiveTab('apkonline')}
                                    className={cn(
                                      "flex-1 py-2 text-[9px] font-bold tracking-wider uppercase border-r border-white/10 transition-all",
                                      webrtcActiveTab === 'apkonline' ? "bg-white/5 text-blue-400" : "text-white/40 hover:text-white"
                                    )}
                                  >
                                    APKOnline
                                  </button>
                                  <button 
                                    onClick={() => setWebrtcActiveTab('novnc')}
                                    className={cn(
                                      "flex-1 py-2 text-[9px] font-bold tracking-wider uppercase border-r border-white/10 transition-all",
                                      webrtcActiveTab === 'novnc' ? "bg-white/5 text-blue-400" : "text-white/40 hover:text-white"
                                    )}
                                  >
                                    noVNC Core
                                  </button>
                                  <button 
                                    onClick={() => setWebrtcActiveTab('tunnel')}
                                    className={cn(
                                      "flex-1 py-2 text-[9px] font-bold tracking-wider uppercase transition-all",
                                      webrtcActiveTab === 'tunnel' ? "bg-white/5 text-blue-400" : "text-white/40 hover:text-white"
                                    )}
                                  >
                                    Túnel Local
                                  </button>
                                </div>

                                <div className="flex-1 p-3 overflow-y-auto max-h-[160px] custom-scrollbar text-[9px] font-mono text-white/70">
                                  {webrtcActiveTab === 'dockerify' && (
                                    <div className="space-y-3">
                                      <div className="flex justify-between items-center text-blue-400 border-b border-white/5 pb-1 font-bold">
                                        <span>dockerify-android Setup (Shmayro)</span>
                                        <button 
                                          onClick={() => {
                                            navigator.clipboard.writeText(`docker run -d -p 6080:6080 --privileged -e EMULATOR_PARAMS="-no-window -gpu swiftshader_indirect" shmayro/dockerify-android:latest`);
                                            setWebrtcLogs(prev => [...prev, "[SYSTEM] Copied Dockerify run command to clipboard!"]);
                                          }}
                                          className="text-[8px] bg-blue-500/15 border border-blue-500/30 text-blue-400 px-1.5 py-0.5 rounded hover:bg-blue-500/30 transition-all"
                                        >
                                          COPY COMMAND
                                        </button>
                                      </div>
                                      <p className="text-white/40 text-[8px] leading-relaxed">
                                        This setup streams an entire Android Emulator via WebSockets/noVNC inside an x86 Ubuntu core container with hardware acceleration.
                                      </p>
                                      <div className="p-2 bg-black/40 rounded border border-white/5 select-all overflow-x-auto whitespace-pre">
{`# 1. Run container
docker run -d \\
  -p 6080:6080 \\
  --privileged \\
  -e EMULATOR_PARAMS="-no-window -gpu swiftshader_indirect" \\
  shmayro/dockerify-android:latest

# 2. Open Streaming Hub & connect:
# Stream URL: http://localhost:6080/vnc.html`}
                                      </div>
                                    </div>
                                  )}

                                  {webrtcActiveTab === 'google' && (
                                    <div className="space-y-3">
                                      <div className="flex justify-between items-center text-blue-400 border-b border-white/5 pb-1 font-bold">
                                        <span>Google Official WebRTC Emulator</span>
                                        <button 
                                          onClick={() => {
                                            navigator.clipboard.writeText(`docker run -d -p 80:80 -p 5554:5554 -p 5555:5555 --device /dev/kvm us-docker.pkg.dev/android-emulator-build/images/r-playstore-x86_64:latest`);
                                            setWebrtcLogs(prev => [...prev, "[SYSTEM] Copied Google WebRTC run command to clipboard!"]);
                                          }}
                                          className="text-[8px] bg-blue-500/15 border border-blue-500/30 text-blue-400 px-1.5 py-0.5 rounded hover:bg-blue-500/30 transition-all"
                                        >
                                          COPY COMMAND
                                        </button>
                                      </div>
                                      <p className="text-white/40 text-[8px] leading-relaxed">
                                        Official Google Emulator Docker containing deep WebRTC engine support. Uses native KVM for full hardware acceleration.
                                      </p>
                                      <div className="p-2 bg-black/40 rounded border border-white/5 select-all overflow-x-auto whitespace-pre">
{`# Requires KVM support on host
docker run -d \\
  -p 8554:8554 \\
  -p 5554:5554 \\
  --device /dev/kvm \\
  --privileged \\
  us-docker.pkg.dev/android-emulator-build/images/r-playstore-x86_64:latest`}
                                      </div>
                                    </div>
                                  )}

                                  {webrtcActiveTab === 'apkonline' && (
                                    <div className="space-y-3">
                                      <div className="flex justify-between items-center text-blue-400 border-b border-white/5 pb-1 font-bold">
                                        <span>apkonline-emulator Integration</span>
                                      </div>
                                      <p className="text-white/40 text-[8px] leading-relaxed">
                                        Provides free online android emulators. You can use their direct container service, find your session WebURL, and paste it inside our Gateway input.
                                      </p>
                                      <div className="p-2 bg-black/40 rounded border border-white/5 select-all overflow-x-auto whitespace-pre">
{`# 1. Start session on apkonline.net
# 2. Copy the active session iframe URL
# 3. Paste it above and connect directly.`}
                                      </div>
                                    </div>
                                  )}

                                  {webrtcActiveTab === 'novnc' && (
                                    <div className="space-y-3">
                                      <div className="flex justify-between items-center text-blue-400 border-b border-white/5 pb-1 font-bold">
                                        <span>adit9852 Platform Setup</span>
                                      </div>
                                      <p className="text-white/40 text-[8px] leading-relaxed">
                                        An industrial setup using a Node.js signaling proxy, Docker containers, and noVNC/React integration to host multiple custom emulators.
                                      </p>
                                      <div className="p-2 bg-black/40 rounded border border-white/5 select-all overflow-x-auto whitespace-pre">
{`# 1. Pull adit9852 platform repo
# 2. Install Node and Docker dependencies
# 3. Mount custom APK directory
# 4. Bind local port to 6080 for bridge access`}
                                      </div>
                                    </div>
                                  )}

                                  {webrtcActiveTab === 'tunnel' && (
                                    <div className="space-y-3">
                                      <div className="flex justify-between items-center text-blue-400 border-b border-white/5 pb-1 font-bold">
                                        <span>Túnel Seguro (HTTPS) - Conexión Real</span>
                                        <button 
                                          onClick={() => {
                                            navigator.clipboard.writeText(`ngrok http 6080`);
                                            setWebrtcLogs(prev => [...prev, "[SYSTEM] Copied ngrok tunnel command to clipboard!"]);
                                          }}
                                          className="text-[8px] bg-blue-500/15 border border-blue-500/30 text-blue-400 px-1.5 py-0.5 rounded hover:bg-blue-500/30 transition-all"
                                        >
                                          COPY NGROK
                                        </button>
                                      </div>
                                      <p className="text-white/40 text-[8px] leading-relaxed">
                                        Este panel en la web corre sobre <strong className="text-white/80">HTTPS</strong>. Los navegadores bloquean iframes que no sean HTTPS por seguridad (Mixed Content). Sigue estos pasos para conectar tu contenedor local real:
                                      </p>
                                      <div className="space-y-2 text-[8px] leading-normal text-white/60">
                                        <div><strong className="text-blue-400">Paso 1:</strong> Inicia el contenedor Docker (`shmayro/dockerify-android`) expuesto en el puerto <code className="bg-white/5 px-1 rounded text-white">6080</code> en tu PC.</div>
                                        <div><strong className="text-blue-400">Paso 2:</strong> En tu PC local, instala y corre un túnel público seguro sobre ese puerto:</div>
                                      </div>
                                      <div className="p-2 bg-black/40 rounded border border-white/5 select-all overflow-x-auto whitespace-pre">
{`# Opción A (ngrok):
ngrok http 6080

# Opción B (Cloudflare Tunnel):
cloudflared tunnel --url http://localhost:6080

# Opción C (LocalTunnel):
npx localtunnel --port 6080`}
                                      </div>
                                      <div className="space-y-1 text-[8px] text-white/50 leading-relaxed bg-blue-500/5 p-2 rounded border border-blue-500/10">
                                        <p><strong className="text-blue-400">Paso 3:</strong> Copia la dirección pública <strong className="text-green-400">https://...</strong> que te devuelva el túnel.</p>
                                        <p><strong className="text-blue-400">Paso 4:</strong> Pégala arriba en el campo "Docker / noVNC Stream URL" y haz clic en <strong className="text-blue-400">CONNECT</strong>.</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Terminal Logs (Connection console) */}
                              <div className="bg-black border border-white/10 rounded-2xl p-3 h-[100px] flex flex-col font-mono text-[9px] text-green-400/90">
                                <div className="flex justify-between items-center border-b border-white/5 pb-1 mb-1">
                                  <span className="text-white/40 text-[8px] uppercase font-bold tracking-wider">Console Outputs</span>
                                  <button 
                                    onClick={() => setWebrtcLogs(["[SYSTEM] Console logs cleared."])}
                                    className="text-[8px] text-red-400/60 hover:text-red-400 font-bold uppercase"
                                  >
                                    Clear
                                  </button>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                                  {webrtcLogs.map((log, index) => (
                                    <div key={index} className="leading-relaxed">
                                      {log}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : activeApp.packageName === 'com.arkaios.apktool' ? (
                          <div className="flex-1 flex flex-col md:flex-row p-4 text-left overflow-y-auto md:overflow-hidden gap-4 custom-scrollbar bg-[#0a0a0c] font-sans h-full">
                            {/* LEFT PANEL: File Tree & Code Editor */}
                            <div className="flex-[2] flex flex-col gap-3 min-w-[320px] h-full md:overflow-y-auto">
                              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                <div>
                                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Wrench className="w-4 h-4 text-orange-400 animate-pulse" />
                                    APKTOOL DECOMPILER STUDIO
                                  </h3>
                                  <p className="text-[9px] text-white/40 uppercase tracking-wider font-mono">v3.0.2 • CONNOR TUMBLESON</p>
                                </div>
                                <div className="flex gap-2">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[8px] font-mono font-bold flex items-center gap-1",
                                    apktoolIsDecompiled ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                                  )}>
                                    <span className={cn("w-1.5 h-1.5 rounded-full", apktoolIsDecompiled ? "bg-green-400" : "bg-orange-400")} />
                                    {apktoolIsDecompiled ? "DECOMPILED" : "AWAITING SOURCE"}
                                  </span>
                                </div>
                              </div>

                              {!apktoolIsDecompiled ? (
                                <div className="flex-1 flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                                  <div className="w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4">
                                    <Binary className="w-6 h-6 text-orange-400" />
                                  </div>
                                  <h4 className="text-sm font-bold text-white mb-2">Select Target Package for Engineering</h4>
                                  <p className="text-xs text-white/40 mb-6 max-w-[280px] leading-relaxed">
                                    Select any registered Android application to extract layout XMLs, resources, manifest details, and smali instruction code.
                                  </p>

                                  <div className="w-full max-w-[300px] space-y-4">
                                    <div className="space-y-1.5 text-left">
                                      <label className="text-[9px] font-mono text-white/40 uppercase tracking-wider block">Target APK Package</label>
                                      <select 
                                        value={apktoolSelectedApk}
                                        onChange={(e) => setApktoolSelectedApk(e.target.value)}
                                        className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-orange-500/50"
                                      >
                                        <option value="com.arkaios.djportal.apk">com.arkaios.djportal.apk (DJ Portal)</option>
                                        <option value="com.android.browser.apk">com.android.browser.apk (Browser)</option>
                                      </select>
                                    </div>

                                    <button
                                      onClick={handleApktoolDecompile}
                                      disabled={apktoolIsDecompiling}
                                      className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white font-bold rounded-xl text-xs shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                                    >
                                      {apktoolIsDecompiling ? (
                                        <>
                                          <RefreshCcw className="w-4 h-4 animate-spin" />
                                          EXTRACTING BINARY XMLs...
                                        </>
                                      ) : (
                                        <>
                                          <Hammer className="w-4 h-4" />
                                          DECOMPILE PACKAGE
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex-1 flex flex-col md:flex-row gap-3 min-h-[400px]">
                                  {/* Left sub-panel: File Tree */}
                                  <div className="w-full md:w-[180px] bg-black/40 border border-white/10 rounded-2xl p-3 flex flex-col gap-2">
                                    <div className="text-[9px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-1 border-b border-white/5 pb-2">
                                      <FolderTree className="w-3.5 h-3.5 text-orange-400" />
                                      Project Tree
                                    </div>
                                    <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar text-[11px] font-mono text-white/70 text-left">
                                      {Object.keys(apktoolEditedContents).map((filePath) => {
                                        const isSelected = apktoolSelectedFile === filePath;
                                        return (
                                          <button
                                            key={filePath}
                                            onClick={() => setApktoolSelectedFile(filePath)}
                                            className={cn(
                                              "w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 transition-all group",
                                              isSelected ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold" : "hover:bg-white/5 border border-transparent text-white/60"
                                            )}
                                          >
                                            <FileCode className={cn("w-3.5 h-3.5", isSelected ? "text-orange-400" : "text-white/40 group-hover:text-white/60")} />
                                            <span className="truncate">{filePath}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                    <button
                                      onClick={() => {
                                        setApktoolIsDecompiled(false);
                                        setApktoolLogs(prev => [...prev, "[SYSTEM] Closed decoded project root."]);
                                      }}
                                      className="py-1 px-2 border border-white/10 rounded-lg text-[9px] font-bold text-white/40 hover:text-white/80 hover:bg-white/5 transition-all text-center w-full mt-2"
                                    >
                                      Change APK
                                    </button>
                                  </div>

                                  {/* Right sub-panel: Code Editor */}
                                  <div className="flex-1 flex flex-col bg-black/60 border border-white/10 rounded-2xl overflow-hidden">
                                    <div className="bg-black/80 px-4 py-2 flex justify-between items-center border-b border-white/10">
                                      <span className="text-[10px] font-mono text-orange-400 font-bold flex items-center gap-1.5">
                                        <Code2 className="w-3.5 h-3.5" />
                                        {apktoolSelectedFile}
                                      </span>
                                      <span className="text-[8px] font-mono text-white/30 uppercase">LIVE RE-WRITING</span>
                                    </div>
                                    <textarea
                                      value={apktoolEditedContents[apktoolSelectedFile] || ''}
                                      onChange={(e) => {
                                        const newContent = e.target.value;
                                        setApktoolEditedContents(prev => ({
                                          ...prev,
                                          [apktoolSelectedFile]: newContent
                                        }));
                                      }}
                                      className="flex-1 p-4 bg-black/20 text-green-400 font-mono text-xs focus:outline-none resize-none custom-scrollbar leading-relaxed text-left"
                                      spellCheck={false}
                                    />
                                    <div className="bg-black/60 px-3 py-1.5 border-t border-white/5 flex justify-between items-center text-[9px] text-white/40 font-mono">
                                      <span>Lines: {(apktoolEditedContents[apktoolSelectedFile] || '').split('\n').length}</span>
                                      <span className="text-orange-500/80">Auto-saved to temporary buffer</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* RIGHT PANEL: Compilation Controls, Terminal, and About */}
                            <div className="flex-1 flex flex-col gap-3 min-w-[300px] h-full md:overflow-y-auto">
                              {/* Tab Selector */}
                              <div className="flex bg-white/5 border border-white/10 rounded-xl overflow-hidden p-0.5">
                                <button
                                  onClick={() => setApktoolActiveTab('decompile')}
                                  className={cn(
                                    "flex-1 py-1.5 text-[9px] font-bold tracking-wider uppercase rounded-lg transition-all",
                                    apktoolActiveTab === 'decompile' ? "bg-orange-500 text-white" : "text-white/40 hover:text-white"
                                  )}
                                >
                                  Console
                                </button>
                                <button
                                  onClick={() => setApktoolActiveTab('rebuild')}
                                  className={cn(
                                    "flex-1 py-1.5 text-[9px] font-bold tracking-wider uppercase rounded-lg transition-all",
                                    apktoolActiveTab === 'rebuild' ? "bg-orange-500 text-white" : "text-white/40 hover:text-white"
                                  )}
                                >
                                  Rebuild & Sign
                                </button>
                                <button
                                  onClick={() => setApktoolActiveTab('about')}
                                  className={cn(
                                    "flex-1 py-1.5 text-[9px] font-bold tracking-wider uppercase rounded-lg transition-all",
                                    apktoolActiveTab === 'about' ? "bg-orange-500 text-white" : "text-white/40 hover:text-white"
                                  )}
                                >
                                  About
                                </button>
                              </div>

                              {/* TAB CONTENT: Console (Command Logs) */}
                              {apktoolActiveTab === 'decompile' && (
                                <div className="flex-1 bg-black border border-white/10 rounded-2xl p-4 flex flex-col font-mono text-[10px] text-orange-400 min-h-[220px]">
                                  <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-2">
                                    <span className="text-white/40 text-[9px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                                      <Terminal className="w-3.5 h-3.5 text-orange-400" />
                                      Apktool stdout
                                    </span>
                                    <button 
                                      onClick={() => setApktoolLogs(["[APKTOOL] Studio cleared."])}
                                      className="text-[9px] text-red-400/60 hover:text-red-400 font-bold uppercase"
                                    >
                                      Clear
                                    </button>
                                  </div>
                                  <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar text-left font-mono">
                                    {apktoolLogs.map((log, index) => (
                                      <div key={index} className="leading-relaxed">
                                        {log}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* TAB CONTENT: Rebuild & Sign */}
                              {apktoolActiveTab === 'rebuild' && (
                                <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-4 min-h-[220px]">
                                  <div className="text-left">
                                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">REBUILD COMPILER STAGE</h4>
                                    <p className="text-[10px] text-white/40 leading-relaxed">
                                      Smali-recompile instruction code, compress resources to APK, apply digital debug signature, and hot-install.
                                    </p>
                                  </div>

                                  <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-left space-y-2">
                                    <div className="flex justify-between items-center text-[9px] font-mono text-white/50 border-b border-white/5 pb-1">
                                      <span>COMPILER DETAILS</span>
                                      <span className="text-green-400 font-bold">READY</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
                                      <div>
                                        <span className="text-white/30">Min SDK:</span> <span className="text-white/80">21 (Android 5.0)</span>
                                      </div>
                                      <div>
                                        <span className="text-white/30">Target SDK:</span> <span className="text-white/80">34 (Android 14)</span>
                                      </div>
                                      <div>
                                        <span className="text-white/30">Signature:</span> <span className="text-white/80">V2 + V3 Schema</span>
                                      </div>
                                      <div>
                                        <span className="text-white/30">AAPT version:</span> <span className="text-white/80">AAPT2 daemon</span>
                                      </div>
                                    </div>
                                  </div>

                                  {apktoolIsRebuilt && (
                                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex gap-2 items-start text-left animate-fade-in">
                                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                      <div className="space-y-0.5">
                                        <p className="text-[10px] font-bold text-green-400 uppercase">MODIFIED APK COMPILED & SIGNED</p>
                                        <p className="text-[9px] text-white/60">
                                          App re-signed and hot-installed on device. Launch it to see your modified changes live!
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  <button
                                    onClick={handleApktoolRebuild}
                                    disabled={!apktoolIsDecompiled || apktoolIsRebuilding}
                                    className="w-full mt-auto py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-white/5 disabled:text-white/20 disabled:border-transparent text-white border border-transparent font-bold rounded-xl text-xs shadow-lg shadow-orange-500/10 transition-all flex items-center justify-center gap-2"
                                  >
                                    {apktoolIsRebuilding ? (
                                      <>
                                        <RefreshCcw className="w-4 h-4 animate-spin" />
                                        REBUILDING CLASSES.DEX...
                                      </>
                                    ) : (
                                      <>
                                        <Hammer className="w-4 h-4" />
                                        RECOMPILE & SIGN APK
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}

                              {/* TAB CONTENT: About Official Apktool */}
                              {apktoolActiveTab === 'about' && (
                                <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col text-left gap-3 overflow-y-auto custom-scrollbar min-h-[220px]">
                                  <div className="flex items-center gap-3 border-b border-white/5 pb-2">
                                    <div className="w-8 h-8 rounded-full bg-orange-500/15 flex items-center justify-center">
                                      <Heart className="w-4 h-4 text-orange-400 fill-orange-400/10" />
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-bold text-white font-mono uppercase">Connor Tumbleson</h4>
                                      <p className="text-[8px] text-white/30">Official Developer & Author</p>
                                    </div>
                                  </div>

                                  <p className="text-[9px] text-white/60 leading-relaxed font-mono">
                                    Apktool is a powerful suite for reverse engineering third-party, closed, binary, Android apps. It can decode resources to nearly original form and rebuild them after making some modifications; it makes it possible to debug smali code step-by-step.
                                  </p>

                                  <div className="space-y-1.5 p-2 bg-black/40 border border-white/5 rounded-xl text-[9px] font-mono">
                                    <div className="flex justify-between">
                                      <span className="text-white/30">GitHub:</span>
                                      <a href="https://github.com/iBotPeaches/Apktool" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">iBotPeaches/Apktool</a>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-white/30">Official Site:</span>
                                      <a href="https://apktool.org" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">apktool.org</a>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-white/30">Patreon:</span>
                                      <a href="https://www.patreon.com/HackUnderway" target="_blank" rel="noreferrer" className="text-orange-400 hover:underline">HackUnderway</a>
                                    </div>
                                  </div>

                                  <div className="text-[8px] text-white/30 italic bg-white/5 p-2 rounded-lg border border-white/5">
                                    "Apktool is NOT intended for piracy and other non-legal uses. It is intended for localization, adding custom layouts, and auditing your own apps."
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : activeApp.type === 'web' ? (
                          <div className="flex-1 bg-white flex flex-col relative">
                            {/* App Header for Capacitor Apps (Minimal) */}
                            {activeApp.packageName.includes('io.capacitor') && (
                              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-blue-500 z-50" />
                            )}
                            
                            {/* Browser UI only for the real Browser app */}
                            {activeApp.packageName === 'com.android.chrome' && (
                              <div className="h-8 bg-gray-100 flex items-center px-3 border-b border-gray-200 gap-2">
                                <div className="w-2 h-2 bg-red-400 rounded-full" />
                                <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                                <div className="w-2 h-2 bg-green-400 rounded-full" />
                                <div className="flex-1 bg-white rounded px-2 py-0.5 text-[8px] text-gray-500 truncate border border-gray-300">
                                  {activeApp.webUrl}
                                </div>
                                <button 
                                  onClick={() => handleSaveToCloud(activeApp)}
                                  className="p-1 hover:bg-green-500/10 text-green-500 rounded transition-colors"
                                  title="Save to Cloud"
                                >
                                  <Database className="w-3 h-3" />
                                </button>
                                <RefreshCcw className="w-3 h-3 text-gray-400" />
                              </div>
                            )}

                            <div className="flex-1 w-full bg-white relative overflow-hidden">
                              <iframe 
                                src={activeApp.webUrl} 
                                className="w-full h-full border-none"
                                title={activeApp.name}
                                referrerPolicy="no-referrer"
                              />
                              {/* Overlay to prevent interaction issues in simulation if needed */}
                              <div className="absolute inset-0 pointer-events-none border-4 border-black/5" />
                            </div>

                            {/* Floating Controls for Capacitor Apps */}
                            {activeApp.packageName.includes('io.capacitor') && (
                              <div className="absolute bottom-4 right-4 flex gap-2">
                                <button 
                                  onClick={() => {
                                    if (!device || !user) return;
                                    const updatedApps = device.installedApps.map(a => 
                                      a.id === activeApp.id ? { ...a, type: 'native', webUrl: undefined } : a
                                    );
                                    const updatedDevice = { ...device, installedApps: updatedApps };
                                    setDoc(doc(db, 'devices', user.uid), updatedDevice);
                                    setDevice(updatedDevice);
                                    setActiveApp({ ...activeApp, type: 'native', webUrl: undefined });
                                    addLog(`Reset ${activeApp.name} to Native Mode.`);
                                  }}
                                  className="p-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-white/60 hover:text-white transition-all shadow-xl"
                                  title="Exit Web View"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex-1 p-4 flex flex-col items-center justify-start text-center gap-4 overflow-y-auto">
                            <div className="w-full h-40 bg-black/40 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col items-center justify-center group">
                              <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
                              <div className="z-10 flex flex-col items-center gap-2">
                                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 animate-pulse">
                                  <Activity className="w-6 h-6 text-blue-400/60" />
                                </div>
                                <div className="text-[10px] font-mono text-blue-400/80 uppercase tracking-widest">Live UI Stream (Simulated)</div>
                                <div className="text-[8px] text-white/20">Vulkan-WebGL Layer Active</div>
                              </div>
                              <div className="absolute bottom-2 right-2 flex gap-1">
                                <div className="w-1 h-1 bg-green-500 rounded-full animate-ping" />
                                <div className="w-1 h-1 bg-green-500 rounded-full" />
                              </div>
                            </div>

                            <div className="w-full">
                              <h4 className="text-lg font-bold text-white">{activeApp.name}</h4>
                              <p className="text-[10px] text-white/40 font-mono mt-1">Package: {activeApp.packageName}</p>
                            </div>

                            <div className="w-full space-y-3 mt-4">
                              <div className="p-4 bg-black/40 rounded-xl border border-white/5 text-left font-mono text-[9px] text-green-400/80">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                  <span className="text-white/60">SAI-GAI-NAI RUNTIME ACTIVE</span>
                                </div>
                                <div>$ adb shell am start -n {activeApp.packageName}</div>
                                <div className="text-white/40">Starting: Intent {'{'} act=android.intent.action.MAIN ... {'}'}</div>
                                <div className="mt-2 text-blue-400"># Execution layer: VULKAN-WEBGL-2.0</div>
                                <div className="text-white/20">Analyzing heap usage... OK</div>
                                <div className="text-white/20">Native bridge established... OK</div>
                              </div>

                              <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-left">
                                <h5 className="text-[10px] font-bold text-white/80 uppercase mb-3">App Dashboard (Simulated)</h5>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                                    <div className="text-[8px] text-white/40 uppercase">Storage</div>
                                    <div className="text-[10px] text-white/80 font-bold">128 MB / 2 GB</div>
                                  </div>
                                  <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                                    <div className="text-[8px] text-white/40 uppercase">Network</div>
                                    <div className="text-[10px] text-green-400 font-bold">Connected</div>
                                  </div>
                                  <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                                    <div className="text-[8px] text-white/40 uppercase">CPU Usage</div>
                                    <div className="text-[10px] text-white/80 font-bold">2.4%</div>
                                  </div>
                                  <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                                    <div className="text-[8px] text-white/40 uppercase">Permissions</div>
                                    <div className="text-[10px] text-white/80 font-bold">Storage, Media</div>
                                  </div>
                                </div>
                              </div>

                              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl text-left">
                                <h5 className="text-[10px] font-bold text-blue-400 uppercase mb-2">Native Bridge Configuration</h5>
                                <p className="text-[9px] text-white/60 mb-3 leading-relaxed">
                                  This APK is running in <strong>Headless Mode</strong>. To enable the visual interface, you must bridge it to a web endpoint or use the Native Client.
                                </p>
                                <div className="flex flex-col gap-2">
                                  <button 
                                    disabled={isAnalyzing}
                                    onClick={() => handleAIUnmask(activeApp)}
                                    className="w-full py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-xl text-[11px] font-black hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-purple-500/20 border border-white/10"
                                  >
                                    {isAnalyzing ? (
                                      <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        AI DEEP SCANNING...
                                      </>
                                    ) : (
                                      <>
                                        <ShieldCheck className="w-4 h-4" />
                                        AI SMART UNMASK (WEB-APP DETECTOR)
                                      </>
                                    )}
                                  </button>
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => {
                                        const url = prompt("Enter Web URL to bridge this app (e.g. https://snaptube.com):");
                                        if (url) {
                                          const updatedApps = device.installedApps.map(a => 
                                            a.id === activeApp.id ? { ...a, type: 'web', webUrl: url } : a
                                          );
                                          setDoc(doc(db, 'devices', user.uid), { ...device, installedApps: updatedApps });
                                          addLog(`Bridged ${activeApp.name} to ${url}`);
                                        }
                                      }}
                                      className="flex-1 py-2 bg-white/5 text-white/60 border border-white/10 rounded-lg text-[10px] font-bold hover:bg-white/10 transition-all"
                                    >
                                      Manual Bridge
                                    </button>
                                    <button 
                                      onClick={() => {
                                        addLog(`Launching ${activeApp.name} in Debug Mode...`);
                                        alert("Debug Mode: Analyzing UI components... No visual assets found in APK manifest.");
                                      }}
                                      className="px-3 py-2 bg-white/5 text-white/60 border border-white/10 rounded-lg text-[10px] font-bold hover:bg-white/10 transition-all"
                                    >
                                      Debug UI
                                    </button>
                                  </div>
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => {
                                        const blob = new Blob([
                                          `SAI-GAI-NAI Virtual APK Package\n`,
                                          `------------------------------\n`,
                                          `App Name: ${activeApp.name}\n`,
                                          `Package: ${activeApp.packageName}\n`,
                                          `Version: ${activeApp.version}\n`,
                                          `------------------------------\n`,
                                          `This is a simulated APK package for the SAI-GAI-NAI ecosystem.`
                                        ], { type: 'application/vnd.android.package-archive' });
                                        const url = window.URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.download = `${activeApp.name.replace(/\s+/g, '_')}.apk`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        window.URL.revokeObjectURL(url);
                                        addLog(`Downloading APK: ${activeApp.name}`);
                                      }}
                                      className="w-full py-2 bg-purple-600/20 text-purple-400 border border-purple-500/20 rounded-lg text-[10px] font-bold hover:bg-purple-600/30 transition-all flex items-center justify-center gap-2"
                                    >
                                      <Download className="w-3 h-3" />
                                      Download APK
                                    </button>
                                  </div>
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => handleSaveToCloud(activeApp)}
                                      className="flex-1 py-2 bg-green-600/20 text-green-400 border border-green-500/20 rounded-lg text-[10px] font-bold hover:bg-green-600/30 transition-all flex items-center justify-center gap-2"
                                    >
                                      <Database className="w-3 h-3" />
                                      Save to Cloud
                                    </button>
                                    <button 
                                      onClick={() => handleUninstall(activeApp)}
                                      className="flex-1 py-2 bg-red-600/20 text-red-400 border border-red-500/20 rounded-lg text-[10px] font-bold hover:bg-red-600/30 transition-all flex items-center justify-center gap-2"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      Uninstall
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <div className="grid grid-cols-4 gap-4">
                        {device.installedApps.map((app) => (
                          <button 
                            key={app.id}
                            onClick={() => {
                              bootApp(app);
                            }}
                            className="flex flex-col items-center gap-1 group"
                          >
                            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white/10 group-active:scale-90 transition-all relative">
                              {app.icon === 'Settings' && <Settings className="w-6 h-6 text-white/60" />}
                              {app.icon === 'Terminal' && <Terminal className="w-6 h-6 text-white/60" />}
                              {app.icon === 'Globe' && <Globe className="w-6 h-6 text-white/60" />}
                              {app.icon === 'Folder' && <HardDrive className="w-6 h-6 text-white/60" />}
                              {app.icon === 'Package' && <Package className="w-6 h-6 text-blue-400/60" />}
                              {app.icon === 'Music' && <Music className="w-6 h-6 text-purple-400/60" />}
                              {app.icon === 'Cpu' && <Cpu className="w-6 h-6 text-emerald-400/60" />}
                              {app.icon === 'Tv' && <Tv className="w-6 h-6 text-cyan-400/60" />}
                              {app.icon === 'Wrench' && <Wrench className="w-6 h-6 text-orange-400/60" />}
                              
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUninstall(app);
                                }}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                              >
                                <Trash2 className="w-2 h-2" />
                              </button>
                            </div>
                            <span className="text-[9px] text-white/60 truncate w-full text-center">{app.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Navigation Bar */}
                <div className="h-12 flex items-center justify-around px-8 pb-2 border-t border-white/5 bg-black/40">
                  <button 
                    onClick={() => {
                      if (activeApp) {
                        setActiveApp(null);
                        addLog("Back button pressed: Closing current app.");
                      }
                    }}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors group"
                  >
                    <ChevronLeft className="w-5 h-5 text-white/40 group-hover:text-white" />
                  </button>
                  <button 
                    onClick={() => {
                      setActiveApp(null);
                      setIsAppSwitcherOpen(false);
                    }}
                    className="p-2 bg-white/10 border border-white/10 rounded-full hover:bg-white/20 transition-all active:scale-90"
                  >
                    <Home className="w-5 h-5 text-white/80" />
                  </button>
                  <button 
                    onClick={() => {
                      setIsAppSwitcherOpen(!isAppSwitcherOpen);
                      addLog("App Switcher toggled.");
                    }}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors group"
                  >
                    <Layers className="w-4 h-4 text-white/40 group-hover:text-white" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Floating Attribution */}
        <div className="absolute bottom-[-40px] text-white/10 text-[10px] font-mono tracking-widest uppercase text-center w-full">
          ecosistema regalado pro Arkaios God "SAI-GAI-NAI" a Google
        </div>
      </div>

      {/* Right Panel: Stats & API */}
      <div className="w-full lg:w-80 flex flex-col gap-6">
        <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
          <h3 className="text-xs font-mono uppercase tracking-widest text-white/40 mb-4">Arkaios Identity</h3>
          {userProfile?.arkaiosId ? (
            <div className="space-y-4">
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-tighter">{userProfile.digitalName}</h4>
                    <p className="text-[8px] text-purple-400 font-mono font-bold">CITIZEN OF ARKAIOS</p>
                  </div>
                </div>
                <div className="p-3 bg-black/40 rounded-xl border border-white/5 font-mono">
                  <div className="text-[8px] text-white/20 uppercase mb-1">Unique Digital ID</div>
                  <div className="text-[11px] text-white font-bold tracking-widest">{userProfile.arkaiosId}</div>
                </div>
              </div>
              <p className="text-[9px] text-white/40 leading-relaxed italic">
                "The first real human in a virtual and digital ecosystem."
              </p>
            </div>
          ) : (
            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-center">
              <p className="text-[10px] text-white/20 italic">Guest Identity Active</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
          <h3 className="text-xs font-mono uppercase tracking-widest text-white/40 mb-4">Device Health</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-white/40">CPU Load</span>
                <span className="text-blue-400">12%</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  animate={{ width: '12%' }}
                  className="h-full bg-blue-500"
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-white/40">RAM Usage</span>
                <span className="text-purple-400">1.2GB / 8GB</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  animate={{ width: '15%' }}
                  className="h-full bg-purple-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
          <h3 className="text-xs font-mono uppercase tracking-widest text-white/40 mb-4">Deep Link Generator</h3>
          <div className="space-y-4">
            <p className="text-[10px] text-white/40">Generate a direct emulation link for any app. Use this to bypass QR-only landing pages.</p>
            <div className="space-y-2">
              <input 
                id="deep-app-name"
                type="text" 
                placeholder="App Name (e.g. Plata Card)" 
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] focus:border-blue-500/50 outline-none"
              />
              <input 
                id="deep-package"
                type="text" 
                placeholder="Package (e.g. mx.platacard)" 
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] focus:border-blue-500/50 outline-none"
              />
              <button 
                onClick={generateDeepLink}
                className="w-full py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl text-[10px] font-bold hover:bg-blue-500/20 transition-all"
              >
                Generate & Copy Link
              </button>
            </div>

            {deepLinkUrl && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 p-4 bg-white rounded-2xl"
              >
                <QRCodeCanvas value={deepLinkUrl} size={120} />
                <div className="w-full">
                  <p className="text-[7px] text-black/40 font-mono uppercase mb-1">Live Production URL:</p>
                  <p className="text-[8px] text-black font-mono text-center break-all bg-black/5 p-2 rounded-lg">{deepLinkUrl}</p>
                </div>
                <div className="text-[10px] text-black font-bold uppercase tracking-wider">Scan to Emulate Now</div>
              </motion.div>
            )}

            <div className="pt-4 border-t border-white/5">
              <p className="text-[9px] text-white/20 mb-2 uppercase font-mono">Example:</p>
              <button 
                onClick={() => {
                  const url = `${window.location.origin}${window.location.pathname}?app=PlataCard&package=mx.platacard`;
                  window.open(url, '_blank');
                }}
                className="text-[10px] text-blue-400/60 hover:text-blue-400 underline decoration-blue-400/20"
              >
                Try Plata Card Direct Emulation →
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
          <h3 className="text-xs font-mono uppercase tracking-widest text-white/40 mb-4">Official Public Project</h3>
          <div className="space-y-3">
            <p className="text-[10px] text-white/40 leading-relaxed">
              This project is publicly available for Google to manage, hydrate, and improve.
            </p>
            <a 
              href="https://ai.studio/apps/15cdbc13-f833-4b64-9d3c-05b22c5e2682?fullscreenApplet=true"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl text-[10px] font-bold hover:bg-purple-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Globe className="w-3 h-3" /> Open in AI Studio
            </a>
          </div>
        </div>

        <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
          <h3 className="text-xs font-mono uppercase tracking-widest text-white/40 mb-4">Connectivity API</h3>
          <div className="p-4 bg-black/40 rounded-2xl border border-white/5 font-mono text-[10px] text-white/60 leading-relaxed">
            <div className="text-blue-400 mb-2">// External Platform Hook</div>
            <div>GET /api/v1/connectivity/status</div>
            <div className="mt-2 text-green-400/80">
              {'{'}<br/>
              &nbsp;&nbsp;"status": "active",<br/>
              &nbsp;&nbsp;"platform": "SAI-GAI-NAI",<br/>
              &nbsp;&nbsp;"version": "1.0.0-alpha"<br/>
              {'}'}
            </div>
          </div>
          <p className="mt-4 text-[10px] text-white/30 leading-tight">
            Use this endpoint to bridge external platforms (e.g. Netflix) to the virtual device ecosystem.
          </p>
        </div>
      </div>
    </div>
  );
}
