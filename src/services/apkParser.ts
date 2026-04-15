import JSZip from 'jszip';
import { Buffer } from 'buffer';

export interface ApkMetadata {
  name: string;
  packageName: string;
  version: string;
  minSdkVersion?: string;
  permissions: string[];
  icon?: string;
}

export async function parseApk(file: File): Promise<ApkMetadata> {
  const zip = new JSZip();
  const content = await zip.loadAsync(file);
  
  // Basic metadata defaults
  let metadata: ApkMetadata = {
    name: file.name.replace('.apk', ''),
    packageName: 'unknown.package',
    version: '1.0.0',
    permissions: []
  };

  try {
    // 1. Try to find AndroidManifest.xml
    const manifestFile = content.file("AndroidManifest.xml");
    if (manifestFile) {
      const manifestBuffer = await manifestFile.async("nodebuffer");
      // Note: This is Binary XML. Real parsing is complex in JS.
      // We will use a heuristic to extract strings.
      const strings = extractStringsFromBinaryXml(manifestBuffer);
      
      // Heuristic: Package names usually look like com.example.app
      const packageMatch = strings.find(s => s.includes('.') && s.split('.').length >= 3 && !s.includes('/') && !s.includes(':'));
      if (packageMatch) metadata.packageName = packageMatch;
      
      // Heuristic: Permissions
      metadata.permissions = strings.filter(s => s.startsWith('android.permission.'));
    }

    // 2. Try to find resources.arsc or strings in assets if it's a hybrid app
    // For now, we'll stick to the manifest heuristics.
    
  } catch (error) {
    console.error("Error parsing APK:", error);
  }

  return metadata;
}

function extractStringsFromBinaryXml(buffer: Buffer): string[] {
  const strings: string[] = [];
  let pos = 0;
  
  // Very simple string extractor for AXML
  // We look for sequences of printable characters
  while (pos < buffer.length) {
    if (buffer[pos] >= 32 && buffer[pos] <= 126) {
      let start = pos;
      while (pos < buffer.length && buffer[pos] >= 32 && buffer[pos] <= 126) {
        pos++;
      }
      if (pos - start > 3) {
        strings.push(buffer.toString('utf8', start, pos));
      }
    }
    pos++;
  }
  
  return Array.from(new Set(strings));
}
