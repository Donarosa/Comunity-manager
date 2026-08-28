# 🚀 Guía de Conexión a Firebase (Firestore y Auth)

El proyecto ya cuenta con toda la arquitectura backend y frontend preparada para funcionar con **Firebase** (Google Sign-In, Login con código OTP por correo y Base de datos Cloud Firestore aislada por usuario).

Actualmente el sistema corre con un **modo local / desarrollo transparente**, lo que te permite probar todo de inmediato. Para conectarlo a tu proyecto real de Firebase en la nube, solo seguí estos pasos:

---

## 1. Crear el proyecto en Firebase Console
1. Ingresá a [Firebase Console](https://console.firebase.google.com/) con tu cuenta de Google.
2. Hacé clic en **"Agregar proyecto"** y dale un nombre (por ejemplo: `community-manager-pymes`).

---

## 2. Activar Firebase Authentication
1. En el menú lateral izquierdo, andá a **Compilación > Authentication**.
2. Hacé clic en **"Comenzar"**.
3. En la pestaña **"Sign-in method"** (Métodos de acceso):
   - **Google**: Habilitá el proveedor Google, elegí tu correo de soporte y guardá.
   - **Correo electrónico / Contraseña**: Habilitá la opción de correo electrónico (y Email link / OTP si lo deseás).

---

## 3. Crear la base de datos Cloud Firestore
1. En el menú lateral izquierdo, andá a **Compilación > Firestore Database**.
2. Hacé clic en **"Crear base de datos"**.
3. Elegí la ubicación de la base de datos (por ejemplo, `us-central1` o `southamerica-east1`) y seleccioná **"Modo de prueba"** o **"Modo de producción"**.
4. En la pestaña **Reglas** de Firestore, pegá el contenido del archivo `firestore.rules` del proyecto.

---

## 4. Obtener las credenciales Web de tu App
1. Andá a **Configuración del proyecto** (icono de engranaje ⚙️ arriba a la izquierda).
2. En la sección **"Tus apps"**, hacé clic en el ícono de Web (`</>`).
3. Registrá tu app (ej. `Community Web`) y copiá el objeto `firebaseConfig`.
4. Pegá los valores en tu archivo `.env`:

```env
FIREBASE_API_KEY=AIzaSy...
FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
FIREBASE_PROJECT_ID=tu-proyecto
FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789012
FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

---

## 5. (Opcional) Credenciales de Servicio para Backend Admin
Para habilitar la verificación de tokens y control total desde el servidor backend:
1. En **Configuración del proyecto > Cuentas de servicio**, hacé clic en **"Generar nueva clave privada"**.
2. Podés extraer el `client_email` y la `private_key` y pegarlos en el `.env`:

```env
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-proyecto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBA...-----END PRIVATE KEY-----\n"
```

---

## 6. ¡Listo!
Reiniciá el servidor:
```bash
npm run web
```
El sistema detectará automáticamente Firebase y empezará a guardar todos los usuarios, marcas, placas generadas, planes semanales e interacciones directamente en Cloud Firestore.
