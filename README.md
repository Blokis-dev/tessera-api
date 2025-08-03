# 🚀 TESSERA API - Documentación Completa de Endpoints

Esta documentación está diseñada para que el frontend pueda consumir cada endpoint de manera precisa. Cada ruta incluye todos los detalles necesarios: métodos HTTP, rutas exactas, parámetros, cuerpos de petición, respuestas y códigos de estado.

## 📋 Información General

- **Base URL**: `http://localhost:3000/api`
- **Autenticación**: JWT almacenado en cookies HttpOnly
- **Content-Type**: `application/json`
- **CORS**: Habilitado para `http://localhost:3001`

---

## ⚙️ **INSTALACIÓN Y CONFIGURACIÓN**

### 🔧 **Requisitos Previos**
- **Node.js**: v18 o superior
- **npm**: v8 o superior
- **PostgreSQL**: Base de datos (recomendado Supabase)
- **Git**: Para clonar el repositorio

### 📥 **Instalación**

1. **Clonar el repositorio**:
```bash
git clone https://github.com/Blokis-dev/tessera-api.git
cd tessera-api
```

2. **Instalar dependencias**:
```bash
npm install
```

3. **Configurar variables de entorno**:
```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar el archivo .env con tus configuraciones
nano .env
```

### 🌍 **Variables de Entorno Requeridas**

Crear un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# ===================================
# DATABASE CONFIGURATION
# ===================================
# Supabase PostgreSQL Database URL
DATABASE_URL=postgresql://postgres.tu_proyecto:tu_password@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://tu_proyecto.supabase.co
SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key

# ===================================
# EMAIL CONFIGURATION (BREVO)
# ===================================
# Para envío de emails automáticos (registro, aprobaciones, etc.)
BREVO_API_KEY=xkeysib-tu_brevo_api_key
FROM_EMAIL=tu_email@domain.com
COMPANY_NAME=Tessera

# ===================================
# APPLICATION URLS
# ===================================
# URLs del frontend para redirecciones y CORS
FRONTEND_URL=http://localhost:3001
LOGIN_URL=http://localhost:3001/auth/first-time-login

# ===================================
# JWT SECURITY
# ===================================
# Clave secreta para firmar tokens JWT (usar una clave fuerte en producción)
JWT_SECRET=tu_super_secreto_jwt_key_muy_seguro_aqui

# ===================================
# SERVER CONFIGURATION
# ===================================
# Puerto donde correrá la API
PORT=3000

# ===================================
# CORS CONFIGURATION
# ===================================
# URLs permitidas para CORS (separadas por comas)
CORS_ORIGIN=http://localhost:3001,http://localhost:3000
CORS_CREDENTIALS=true

# ===================================
# PINATA IPFS CONFIGURATION
# ===================================
# Para almacenar certificados en IPFS (blockchain)
PINATA_JWT=tu_pinata_jwt_token
PINATA_GATEWAY_URL=tu_gateway.mypinata.cloud
PINATA_API_KEY=tu_pinata_api_key
PINATA_SECRET_KEY=tu_pinata_secret_key

```

### 🚀 **Ejecutar el Proyecto**

#### **Desarrollo**:
```bash
# Modo desarrollo con hot reload
npm run start:dev

# O con watch mode
npm run dev
```

#### **Producción**:
```bash
# Compilar el proyecto
npm run build

# Ejecutar en producción
npm run start:prod
```

#### **Verificar que está funcionando**:
```bash
# La API debería estar disponible en:
# http://localhost:3000

# Verificar health check:
curl http://localhost:3000/api/health

# Ver documentación Swagger:
# http://localhost:3000/api
```

### 🗄️ **Configuración de Base de Datos**

#### **Opción 1: Supabase (Recomendado)**
1. Crear cuenta en [Supabase](https://supabase.com)
2. Crear nuevo proyecto
3. Copiar las credenciales al archivo `.env`
4. Las tablas se crean automáticamente al ejecutar la aplicación

#### **Opción 2: PostgreSQL Local**
```bash
# Instalar PostgreSQL
# Crear base de datos
createdb tessera_db

# Actualizar DATABASE_URL en .env:
DATABASE_URL=postgresql://usuario:password@localhost:5432/tessera_db
```

### 📧 **Configuración de Email (Brevo)**

1. Crear cuenta en [Brevo](https://www.brevo.com/)
2. Generar API Key en configuración
3. Agregar la API Key al archivo `.env`
4. Verificar el email remitente en Brevo

### 🔗 **Configuración de IPFS (Pinata)**

1. Crear cuenta en [Pinata](https://pinata.cloud/)
2. Generar API Keys
3. Agregar las credenciales al archivo `.env`

### 🧪 **Scripts Disponibles**

```bash
# Desarrollo
npm run start:dev         # Inicia en modo desarrollo
npm run dev              # Alias para start:dev

# Producción
npm run build            # Compila el proyecto
npm run start:prod       # Ejecuta la versión compilada

# Testing
npm run test             # Ejecuta tests unitarios
npm run test:e2e         # Ejecuta tests end-to-end
npm run test:cov         # Tests con coverage

# Linting y formato
npm run lint             # Revisa el código
npm run format          # Formatea el código

# Base de datos
npm run seed            # Crea datos de prueba (desarrollo)
```

### 🔒 **Configuración de Seguridad**

#### **Para Desarrollo**:
- JWT_SECRET puede ser cualquier string largo
- CORS permite localhost
- Cookies no requieren HTTPS

#### **Para Producción**:
- Usar JWT_SECRET criptográficamente seguro
- Configurar CORS solo para dominios específicos
- Habilitar HTTPS
- Usar variables de entorno seguras

### 🚨 **Solución de Problemas Comunes**

#### **Error de conexión a base de datos**:
```bash
# Verificar que DATABASE_URL es correcta
# Verificar que Supabase permite conexiones externas
# Verificar firewall/red
```

#### **Error de CORS**:
```bash
# Verificar CORS_ORIGIN en .env
# Asegurar que el frontend usa credentials: 'include'
```

#### **Error de cookies**:
```bash
# Verificar que el frontend y backend están en el mismo dominio/localhost
# Verificar configuración de CORS_CREDENTIALS=true
```

---

## 🔐 **ENDPOINTS DE AUTENTICACIÓN** - `/api/auth`

### 1. 🔑 **LOGIN**
```http
POST /api/auth/login
```

**Descripción**: Iniciar sesión con cookies seguras. El JWT se almacena en cookies HttpOnly.

**Request Body**:
```json
{
  "email": "admin@tessera.com",
  "password": "admin123"
}
```

**Response Success (200)**:
```json
{
  "user": {
    "id": "uuid-string",
    "email": "admin@tessera.com",
    "full_name": "Administrador",
    "role": "admin",
    "institution_id": "uuid-string",
    "institution_name": "Universidad Nacional",
    "status": "verified",
    "first_time_login": false
  },
  "message": "Login successful - Secure tokens set in cookies"
}
```

**Response Error - Primer Login Requerido (403)**:
```json
{
  "error": "REDIRECT_TO_FIRST_TIME_LOGIN",
  "message": "User must change password on first login",
  "action": "redirect_to_first_time_login",
  "redirectUrl": "http://localhost:3001/first-time-login?email=user@example.com"
}
```

**Response Error - Credenciales Inválidas (401)**:
```json
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
```

---

### 2. 🚪 **LOGOUT**
```http
POST /api/auth/logout
```

**Descripción**: Cerrar sesión y limpiar cookies.

**Headers**: Requiere cookies de autenticación.

**Response Success (200)**:
```json
{
  "message": "Logout successful - Cookies cleared"
}
```

---

### 3. ✅ **VERIFICAR TOKEN**
```http
GET /api/auth/verify
```

**Descripción**: Verificar si el usuario está autenticado.

**Headers**: Requiere cookies de autenticación.

**Response Success (200)**:
```json
{
  "userId": "uuid-string",
  "email": "user@example.com",
  "full_name": "Usuario Ejemplo",
  "role": "owner",
  "institution_id": "uuid-string",
  "institution_name": "Mi Institución",
  "status": "verified",
  "verified": true,
  "message": "Token from cookie is valid"
}
```

**Response Error (401)**:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

### 4. 👤 **INFORMACIÓN COMPLETA DEL USUARIO**
```http
GET /api/auth/myinfo
```

**Descripción**: Obtener información completa del usuario autenticado, incluyendo todos los datos personales y de la institución.

**Headers**: Requiere cookies de autenticación.

**Response Success (200)**:
```json
{
  "id": "uuid-string",
  "email": "user@example.com",
  "full_name": "Usuario Ejemplo",
  "role": "owner",
  "status": "verified",
  "first_time_login": false,
  "created_at": "2025-01-01T00:00:00.000Z",
  "updated_at": "2025-01-01T00:00:00.000Z",
  "institution": {
    "id": "uuid-string",
    "name": "Mi Institución",
    "legal_id": "12345678901",
    "email": "contacto@institucion.edu",
    "website": "https://institucion.edu",
    "description": "Universidad líder en educación superior",
    "logo_url": "https://institucion.edu/logo.png",
    "status": "approved"
  },
  "permissions": [
    "read:institution",
    "write:institution",
    "create:certificates",
    "manage:users"
  ]
}
```

**Response Error (401)**:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Response Error (404)**:
```json
{
  "statusCode": 404,
  "message": "User not found"
}
```

---

### 5. 🔄 **PRIMER LOGIN** (Cambio de Contraseña Temporal)
```http
POST /api/auth/first-time-login
```

**Descripción**: Cambiar contraseña temporal en el primer login.

**Request Body**:
```json
{
  "email": "user@example.com",
  "temporary_password": "TempPass123!",
  "new_password": "MiNuevaPassword123!",
  "confirm_password": "MiNuevaPassword123!"
}
```

**Response Success (200)**:
```json
{
  "message": "Password changed successfully. Please login with your new password.",
  "user": {
    "id": "uuid-string",
    "email": "user@example.com",
    "full_name": "Usuario Ejemplo",
    "role": "owner",
    "institution_id": "uuid-string",
    "status": "verified",
    "first_time_login": false
  },
  "requiresNewLogin": true
}
```

**Response Error (400)**:
```json
{
  "statusCode": 400,
  "message": "Invalid temporary password"
}
```

---

### 6. 🔒 **CAMBIAR CONTRASEÑA**
```http
PATCH /api/auth/change-password
```

**Descripción**: Cambiar contraseña para usuarios ya autenticados.

**Headers**: Requiere cookies de autenticación.

**Request Body**:
```json
{
  "current_password": "MiPasswordActual123!",
  "new_password": "MiNuevaPassword456!",
  "confirm_password": "MiNuevaPassword456!"
}
```

**Response Success (200)**:
```json
{
  "message": "Password changed successfully",
  "user": {
    "id": "uuid-string",
    "email": "user@example.com",
    "full_name": "Usuario Ejemplo",
    "role": "owner"
  }
}
```

---

### 7. 🔍 **VERIFICAR ESTADO PRIMER LOGIN**
```http
GET /api/auth/check-first-time/:email
```

**Descripción**: Verificar si un usuario necesita hacer primer login.

**Parámetros URL**:
- `email`: Email del usuario

**Response Success (200)**:
```json
{
  "email": "user@example.com",
  "isFirstTimeLogin": true,
  "userExists": true,
  "status": "verified"
}
```

---

## 🏢 **ENDPOINTS DE COMPAÑÍAS** - `/api/companies`

### 1. ➕ **CREAR COMPAÑÍA CON PROPIETARIO**
```http
POST /api/companies/create-with-owner
```

**Descripción**: Crear institución y usuario propietario en una transacción atómica. Esta es la ÚNICA forma de crear usuarios en el sistema.

**Request Body**:
```json
{
  "name": "Universidad Nacional de Ejemplo",
  "legal_id": "12345678901",
  "email_institucional": "contacto@universidad.edu",
  "owner_email": "propietario@universidad.edu",
  "owner_full_name": "Juan Pérez",
  "website": "https://universidad.edu",
  "description": "Universidad líder en educación superior"
}
```

**Response Success (201)**:
```json
{
  "user": {
    "id": "uuid-string",
    "email": "propietario@universidad.edu",
    "full_name": "Juan Pérez",
    "role": "owner",
    "status": "pending",
    "first_time_login": true
  },
  "company": {
    "id": "uuid-string",
    "name": "Universidad Nacional de Ejemplo",
    "legal_id": "12345678901",
    "email_institucional": "contacto@universidad.edu",
    "website": "https://universidad.edu",
    "description": "Universidad líder en educación superior",
    "status": "pending"
  },
  "temporaryPassword": "Casa-Luna-123",
  "message": "Institution and owner created successfully. Temporary password: Casa-Luna-123",
  "important_notice": "The user must change this password on first login. Please communicate this password securely to the user."
}
```

**Response Error (409)**:
```json
{
  "statusCode": 409,
  "message": "Email or legal ID already exists"
}
```

---

### 2. 📋 **LISTAR COMPAÑÍAS** (Solo Admin)
```http
GET /api/companies
```

**Descripción**: Obtener lista de todas las compañías.

**Headers**: Requiere cookies de autenticación y rol admin.

**Response Success (200)**:
```json
[
  {
    "id": "uuid-string",
    "name": "Universidad Nacional",
    "legal_id": "12345678901",
    "email_institucional": "contacto@universidad.edu",
    "website": "https://universidad.edu",
    "status": "verified",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
]
```

---

### 3. 🔍 **OBTENER COMPAÑÍA POR ID** (Solo Admin)
```http
GET /api/companies/:id
```

**Descripción**: Obtener detalles de una compañía específica.

**Parámetros URL**:
- `id`: UUID de la compañía

**Headers**: Requiere cookies de autenticación y rol admin.

**Response Success (200)**:
```json
{
  "id": "uuid-string",
  "name": "Universidad Nacional",
  "legal_id": "12345678901",
  "email_institucional": "contacto@universidad.edu",
  "website": "https://universidad.edu",
  "description": "Universidad líder en educación",
  "status": "verified",
  "created_at": "2025-01-01T00:00:00.000Z",
  "updated_at": "2025-01-01T00:00:00.000Z"
}
```

---

## 👥 **ENDPOINTS DE USUARIOS** - `/api/users`

### 1. 👤 **PERFIL PERSONAL**
```http
GET /api/users/profile
```

**Descripción**: Obtener perfil del usuario autenticado.

**Headers**: Requiere cookies de autenticación.

**Response Success (200)**:
```json
{
  "id": "uuid-string",
  "email": "user@example.com",
  "full_name": "Usuario Ejemplo",
  "role": "owner",
  "status": "verified",
  "first_time_login": false,
  "institution": {
    "id": "uuid-string",
    "name": "Mi Institución",
    "email_institucional": "contacto@institucion.edu"
  },
  "created_at": "2025-01-01T00:00:00.000Z"
}
```

---

### 2. 📋 **LISTAR USUARIOS** (Solo Admin)
```http
GET /api/users
```

**Descripción**: Obtener lista de todos los usuarios.

**Headers**: Requiere cookies de autenticación y rol admin.

**Response Success (200)**:
```json
[
  {
    "id": "uuid-string",
    "email": "user@example.com",
    "full_name": "Usuario Ejemplo",
    "role": "owner",
    "status": "verified",
    "first_time_login": false,
    "institution_name": "Mi Institución",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
]
```

---

### 3. 🔍 **OBTENER USUARIO POR EMAIL** (Solo Admin)
```http
GET /api/users/:email
```

**Descripción**: Obtener detalles de un usuario específico.

**Parámetros URL**:
- `email`: Email del usuario

**Headers**: Requiere cookies de autenticación y rol admin.

**Response Success (200)**:
```json
{
  "id": "uuid-string",
  "email": "user@example.com",
  "full_name": "Usuario Ejemplo",
  "role": "owner",
  "status": "verified",
  "first_time_login": false,
  "institution": {
    "id": "uuid-string",
    "name": "Mi Institución"
  },
  "created_at": "2025-01-01T00:00:00.000Z"
}
```

---

## ⚙️ **ENDPOINTS DE ADMINISTRACIÓN** - `/api/admin`

### 1. 📝 **INSTITUCIONES PENDIENTES**
```http
GET /api/admin/institutions/pending
```

**Descripción**: Obtener lista de instituciones pendientes de aprobación.

**Headers**: Requiere cookies de autenticación y rol admin.

**Response Success (200)**:
```json
[
  {
    "id": "uuid-string",
    "name": "Universidad Pendiente",
    "legal_id": "98765432109",
    "email_institucional": "contacto@pendiente.edu",
    "website": "https://pendiente.edu",
    "status": "pending",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
]
```

---

### 2. 👥 **USUARIOS PENDIENTES**
```http
GET /api/admin/users/pending
```

**Descripción**: Obtener lista de usuarios pendientes de aprobación.

**Headers**: Requiere cookies de autenticación y rol admin.

**Response Success (200)**:
```json
[
  {
    "id": "uuid-string",
    "email": "pendiente@example.com",
    "full_name": "Usuario Pendiente",
    "role": "owner",
    "status": "pending",
    "institution_name": "Institución Pendiente",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
]
```

---

### 3. ✅ **APROBAR INSTITUCIÓN**
```http
PATCH /api/admin/institutions/approve
```

**Descripción**: Aprobar o rechazar una institución.

**Headers**: Requiere cookies de autenticación y rol admin.

**Request Body**:
```json
{
  "institutionId": "uuid-string",
  "status": "verified",
  "adminNotes": "Institución aprobada después de verificar documentación"
}
```

**Response Success (200)**:
```json
{
  "id": "uuid-string",
  "name": "Universidad Aprobada",
  "status": "verified",
  "admin_notes": "Institución aprobada después de verificar documentación",
  "updated_at": "2025-01-01T00:00:00.000Z"
}
```

---

### 4. ✅ **APROBAR USUARIO**
```http
PATCH /api/admin/users/approve
```

**Descripción**: Aprobar o rechazar un usuario. Al aprobar, se envía email automático con contraseña temporal.

**Headers**: Requiere cookies de autenticación y rol admin.

**Request Body**:
```json
{
  "userId": "uuid-string",
  "status": "verified",
  "adminNotes": "Usuario aprobado - documentación verificada"
}
```

**Response Success (200)**:
```json
{
  "id": "uuid-string",
  "email": "user@example.com",
  "full_name": "Usuario Aprobado",
  "status": "verified",
  "admin_notes": "Usuario aprobado - documentación verificada",
  "updated_at": "2025-01-01T00:00:00.000Z",
  "email_sent": true,
  "message": "User approved and notification email sent successfully"
}
```

---

### 5. 🗑️ **ELIMINAR USUARIO Y COMPAÑÍA**
```http
DELETE /api/admin/users/:id/with-company
```

**Descripción**: Eliminar usuario y su compañía asociada (operación irreversible).

**Parámetros URL**:
- `id`: UUID del usuario

**Headers**: Requiere cookies de autenticación y rol admin.

**Response Success (200)**:
```json
{
  "message": "User and associated company deleted successfully",
  "deletedUser": {
    "id": "uuid-string",
    "email": "deleted@example.com"
  },
  "deletedCompany": {
    "id": "uuid-string",
    "name": "Compañía Eliminada"
  }
}
```

---

### 6. 🔧 **CONFIGURACIÓN DE URLs**
```http
GET /api/admin/config/urls
```

**Descripción**: Obtener configuración de URLs del sistema.

**Headers**: Requiere cookies de autenticación y rol admin.

**Response Success (200)**:
```json
{
  "frontend_url": "http://localhost:3001",
  "login_url": "http://localhost:3001/login",
  "api_url": "http://localhost:3000/api"
}
```

---

## 🌱 **ENDPOINTS DE SEEDERS** - `/api/seed`

### 1. 👥 **SEED USUARIOS**
```http
POST /api/seed/users
```

**Descripción**: Crear usuarios de prueba (solo desarrollo).

**Response Success (201)**:
```json
{
  "message": "Users seeded successfully",
  "count": 5
}
```

---

### 2. 🏢 **SEED INSTITUCIONES**
```http
POST /api/seed/institutions
```

**Descripción**: Crear instituciones de prueba (solo desarrollo).

**Response Success (201)**:
```json
{
  "message": "Institutions seeded successfully",
  "count": 3
}
```

---

### 3. 🌍 **SEED TODO**
```http
POST /api/seed/all
```

**Descripción**: Crear todos los datos de prueba (solo desarrollo).

**Response Success (201)**:
```json
{
  "message": "All data seeded successfully",
  "users": 5,
  "institutions": 3
}
```

---

## 🌐 **ENDPOINTS GENERALES** - `/api`

### 1. 👋 **SALUDO**
```http
GET /api
```

**Descripción**: Endpoint público de prueba.

**Response Success (200)**:
```json
"Hello World!"
```

---

### 2. ❤️ **HEALTH CHECK**
```http
GET /api/health
```

**Descripción**: Verificar estado de la aplicación y base de datos.

**Response Success (200)**:
```json
{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "database": {
    "status": "connected",
    "responseTime": "45ms"
  }
}
```

---

### 3. 🔒 **RUTA PROTEGIDA**
```http
GET /api/protected
```

**Descripción**: Endpoint de prueba que requiere autenticación.

**Headers**: Requiere cookies de autenticación.

**Response Success (200)**:
```json
"Hello user@example.com, this is a protected route!"
```

---

### 4. 👑 **SOLO ADMIN**
```http
GET /api/admin-only
```

**Descripción**: Endpoint de prueba solo para administradores.

**Headers**: Requiere cookies de autenticación y rol admin.

**Response Success (200)**:
```json
"Hello Admin, you have special access!"
```

---

## 🚨 **CÓDIGOS DE ESTADO Y ERRORES**

### Códigos de Estado Comunes:
- **200**: Operación exitosa
- **201**: Recurso creado exitosamente
- **400**: Datos de entrada inválidos
- **401**: No autenticado (cookie inválida o faltante)
- **403**: No autorizado (sin permisos para la operación)
- **404**: Recurso no encontrado
- **409**: Conflicto (recurso ya existe)
- **500**: Error interno del servidor

### Estructura de Error Estándar:
```json
{
  "statusCode": 400,
  "message": "Descripción del error",
  "error": "Bad Request"
}
```

---

## 🍪 **MANEJO DE COOKIES**

El sistema utiliza cookies HttpOnly para almacenar tokens JWT:

- **Nombre de cookie**: `tessera_token` y `tessera_secure`
- **HttpOnly**: `true` (no accesible desde JavaScript)
- **Secure**: `true` en producción
- **SameSite**: `lax`
- **Duración**: 24 horas
- **Path**: `/`

### Para desarrollo con frontend:
```javascript
// Las cookies se manejan automáticamente por el navegador
// No es necesario enviar headers Authorization

// Ejemplo con fetch:
fetch('http://localhost:3000/api/auth/verify', {
  credentials: 'include' // Importante: incluir cookies
})
```

---

## 🔐 **FLUJO DE AUTENTICACIÓN COMPLETO**

### 1. Registro de Nueva Institución:
```
POST /api/companies/create-with-owner
→ Usuario creado con status "pending"
→ Contraseña temporal generada
```

### 2. Aprobación por Admin:
```
PATCH /api/admin/users/approve
→ Usuario cambia a status "verified"
→ Email enviado automáticamente con contraseña temporal
```

### 3. Primer Login del Usuario:
```
POST /api/auth/login (con contraseña temporal)
→ Error 403: REDIRECT_TO_FIRST_TIME_LOGIN
→ POST /api/auth/first-time-login
→ Usuario cambia contraseña y first_time_login = false
```

### 4. Login Normal:
```
POST /api/auth/login
→ Cookies JWT establecidas
→ Usuario autenticado
```

---

## 📋 **VALIDACIONES DE CONTRASEÑAS**

Las contraseñas deben cumplir:
- Mínimo 8 caracteres
- Al menos 1 letra mayúscula
- Al menos 1 letra minúscula  
- Al menos 1 número
- Al menos 1 carácter especial

---

## 🎯 **NOTAS IMPORTANTES PARA EL FRONTEND**

1. **Siempre incluir `credentials: 'include'`** en las peticiones fetch
2. **Los endpoints protegidos requieren cookies válidas**
3. **Manejar el error 403 con `REDIRECT_TO_FIRST_TIME_LOGIN`** para primer login
4. **Los roles se validan automáticamente** - no enviar en headers
5. **Las fechas están en formato ISO 8601**
6. **Los UUIDs son strings** - no convertir a otros tipos

## **Uso de IA**
Se uso copilot para troubleshooting y documentacion de codigo, V0 para creacion de componentes y chatgpt para lluvia de ideas