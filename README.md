# SAI-GAI-NAI: Android Web Emulator & Native Bridge Ecosystem

Este ecosistema está diseñado para la emulación de alto rendimiento de aplicaciones Android (APK) y Web-Apps (Capacitor) directamente en el navegador, con capacidad de interconexión nativa.

## 1. Instalable de Windows (Modo Local)

Para ejecutar **SAI-GAI-NAI** como una aplicación nativa en Windows y obtener el "sistema real" emulado localmente, utilizamos un wrapper de **Electron**.

### Pasos para crear el instalable:
1. **Instalar dependencias de desarrollo**:
   ```bash
   npm install --save-dev electron electron-builder
   ```
2. **Configurar `main.js` (Electron Entry)**:
   Crea un archivo `main.js` que cargue la URL de producción: `https://ais-pre-rkrmlrmtlsgs6r3rwd5amc-53917996317.us-west2.run.app`.
3. **Build del instalable**:
   ```bash
   npx electron-builder
   ```
   Esto generará un `.exe` que permite la ejecución fuera del navegador, con acceso a APIs de sistema de archivos local si se requiere.

## 2. Interconexión Web-Local (Native Bridge)

El sistema utiliza un mecanismo de **Deep Linking** y **Native Bridges** (archivos HTML descargables) para conectar la instancia web con el entorno local.

- **Deep Link**: `?app=Nombre&package=com.package` permite que cualquier instancia (web o local) rehidrate el estado de una app específica.
- **Sincronización**: Todo el estado (apps instaladas, logs, configuraciones) se guarda en **Google Firestore**, lo que permite que si instalas una APK en la web, aparezca instantáneamente en tu cliente de Windows.

## 3. Optimización de APKs en la Web

La optimización se realiza mediante el **SAI-GAI-NAI Capacitor Engine**:
1. **Análisis de Assets**: El sistema extrae los recursos estáticos de la APK.
2. **Webview Injection**: Se inyecta un runtime de Capacitor que mapea las llamadas nativas de Android (Java/Kotlin) a Web APIs (JavaScript).
3. **VULKAN-WEBGL-2.0**: Utilizamos WebGL 2.0 para emular la aceleración gráfica por hardware, permitiendo que juegos y apps pesadas corran fluidamente en el navegador.

## 4. Infraestructura en Google Cloud

- **Google Cloud Run**: El núcleo del emulador se despliega en contenedores de Cloud Run. Esto permite que el sistema sea "serverless", escalando a cero cuando no se usa y ofreciendo una latencia mínima para la renderización de la interfaz.
- **Firebase (Firestore & Auth)**: Se utiliza para la persistencia de datos. Cada vez que realizas una optimización de APK, el resultado se almacena en un bucket de almacenamiento y la referencia se guarda en Firestore, permitiendo que tu dispositivo virtual "recuerde" las apps instaladas sin importar desde dónde accedas.
- **Optimización en Servidor**: Para APKs reales, el proceso de "Build" se delega a un worker en la nube que realiza el desensamblado y la transpilación de código nativo a WebAssembly (Wasm) cuando es necesario para mantener el rendimiento.

## 5. Streaming WebRTC / noVNC & Túnel Local Seguro

Para conectar un emulador de Android real corriendo localmente en tu ordenador con la interfaz en la nube de **SAI-GAI-NAI** (la cual requiere protocolo seguro **HTTPS**), es indispensable esquivar las restricciones de *Mixed Content* (contenido mixto) de los navegadores web modernos. Los navegadores bloquean cualquier iframe `http://` si la web principal está bajo `https://`.

Sigue esta reglamentación técnica para crear un puente seguro (Túnel HTTPS) utilizando el agente local:

### Requisitos Previos en tu Ordenador (Local)
1. Tener **Docker** instalado y en ejecución.
2. Descargar y ejecutar el emulador de Android dockerizado:
   ```bash
   docker run -d \
     -p 6080:6080 \
     --privileged \
     -e EMULATOR_PARAMS="-no-window -gpu swiftshader_indirect" \
     shmayro/dockerify-android:latest
   ```
   *Nota: El emulador estará disponible localmente en el puerto `http://localhost:6080/vnc.html`.*

---

### Métodos para Crear el Túnel Seguro (HTTPS)

Elige una de las siguientes tres herramientas estándar para exponer tu puerto local `6080` de forma segura:

#### Opción A: ngrok (Recomendado por Estabilidad)
1. Descarga e instala [ngrok](https://ngrok.com/).
2. Configura tu token de autenticación (solo la primera vez):
   ```bash
   ngrok config add-authtoken TU_TOKEN_AQUÍ
   ```
3. Ejecuta el túnel apuntando al puerto del emulador:
   ```bash
   ngrok http 6080
   ```
4. Copia la URL pública generada que comience con **`https://`** (ej. `https://1234-abcd.ngrok-free.app/vnc.html` o la URL base con `/vnc.html` al final).

#### Opción B: Cloudflare Tunnel (Totalmente Gratis y sin Límites)
1. Descarga e instala [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).
2. Inicia un túnel rápido sin necesidad de registro:
   ```bash
   cloudflared tunnel --url http://localhost:6080
   ```
3. Busca en la salida de la consola la URL con el subdominio de Cloudflare que comience con **`https://`** (ej. `https://some-random-words.trycloudflare.com`).
4. Añade `/vnc.html` al final de la URL copiada.

#### Opción C: localtunnel (Rápido y vía Node.js)
1. Ejecuta directamente usando `npx` (requiere Node.js instalado):
   ```bash
   npx localtunnel --port 6080
   ```
2. Copia la URL segura provista (`https://...localtunnel.me`).
3. Añade `/vnc.html` al final de la URL copiada.

---

### Vinculación en el Streaming Hub de la Web

1. Abre la aplicación **Streaming Hub** dentro de tu dispositivo virtual en el navegador.
2. Asegúrate de estar en la pestaña **TÚNEL LOCAL** para ver la documentación interactiva si es necesario.
3. En el campo **Docker / noVNC Stream URL**, pega la dirección `https://` generada por tu túnel local (ej: `https://abcd-123.ngrok-free.app/vnc.html`).
4. Haz clic en **CONNECT**.
5. ¡Listo! Tu navegador ahora transmitirá, controlará y renderizará en tiempo real las pulsaciones táctiles, ADB y video nativo del emulador de tu PC local sin violar las políticas de seguridad SSL.

---

## 6. Referencia del Proyecto Público (AI Studio)

Este proyecto está disponible públicamente para que Google lo gestione, hidrate y mejore en el siguiente enlace oficial:

🔗 **Enlace del Proyecto:** [https://ai.studio/apps/15cdbc13-f833-4b64-9d3c-05b22c5e2682?fullscreenApplet=true](https://ai.studio/apps/15cdbc13-f833-4b64-9d3c-05b22c5e2682?fullscreenApplet=true)

---
*Ecosistema regalado pro Arkaios God "SAI-GAI-NAI" a Google.*
