# Portfolio Management App

Una aplicación web completa para la gestión de portafolios de inversión que permite a los usuarios simular la compra y venta de acciones, gestionar su balance de efectivo y analizar el rendimiento de sus inversiones.

### Instalación y Ejecución
```bash
# 1. Instalar dependencias
npm install

# 2. Configurar base de datos MySQL
# 3. Crear archivo .env

# 4. Ejecutar aplicación
npm start
# o para desarrollo
npm run dev

# Servidor: http://localhost:3000
# API: http://localhost:3000/api/
```

## 🏗️ Arquitectura del Sistema

### Patrón de Arquitectura: MVC + API REST
```
├── Frontend (Static HTML/CSS/JS)
│   ├── Páginas Web (/public/*.html)
│   ├── JavaScript Vanilla
│   └── Chart.js para visualizaciones
│
├── Backend (Node.js + Express)
│   ├── API REST (/api/*)
│   ├── Autenticación JWT
│   ├── Middlewares de seguridad
│   └── Servicios externos (Finance API)
│
└── Base de Datos (MySQL + Sequelize ORM)
    ├── Usuarios
    ├── Inversiones
    └── Transacciones
```

## 📁 Estructura del Proyecto

```
portfolio-management-app/
├── src/                          # Código del servidor
│   ├── config/                   # Configuraciones
│   │   └── database.js           # Configuración de BD
│   ├── controllers/               # Controladores de rutas
│   │   ├── authController.js     # Autenticación JWT
│   │   ├── investmentController.js # Gestión de inversiones
│   │   ├── portfolioController.js # Resumen del portafolio
│   │   └── marketController.js   # Datos del mercado
│   ├── middleware/               # Middlewares
│   │   └── auth.js              # Verificación JWT
│   ├── models/                   # Modelos de Sequelize
│   │   ├── User.js              # Modelo de usuario
│   │   ├── Investment.js        # Modelo de inversión
│   │   ├── Transaction.js       # Modelo de transacción
│   │   └── index.js            # Asociaciones
│   ├── routes/                   # Rutas de la API
│   │   ├── auth.js             # Rutas de autenticación
│   │   ├── investments.js      # Rutas de inversiones
│   │   ├── portfolio.js        # Rutas del portafolio
│   │   └── market.js           # Rutas del mercado
│   ├── services/                # Servicios externos
│   │   └── financeAPI.js       # API de datos financieros
│   └── app.js                   # Aplicación principal
├── public/                       # Frontend estático
│   ├── *.html                   # Páginas HTML
│   └── js/                      # JavaScript del cliente
│       └── auth.js             # Gestión de autenticación
├── .env                         # Variables de entorno
└── package.json                # Dependencias
```

## 🔌 API Endpoints

### Autenticación (`/api/auth`)
```
POST /api/auth/register     # Registro de usuario
POST /api/auth/login        # Inicio de sesión
GET  /api/auth/profile      # Obtener perfil [AUTH]
POST /api/auth/refresh      # Renovar token [AUTH]
POST /api/auth/logout       # Cerrar sesión [AUTH]
GET  /api/auth/verify       # Verificar token [AUTH]
```

### Inversiones (`/api/investments`)
```
GET    /api/investments/                    # Listar inversiones [AUTH]
POST   /api/investments/                    # Comprar acciones [AUTH]
GET    /api/investments/:id                 # Obtener inversión [AUTH]
POST   /api/investments/:id/sell            # Vender acciones [AUTH]
DELETE /api/investments/:id                 # Eliminar inversión [AUTH]
GET    /api/investments/cash/balance        # Balance de efectivo [AUTH]
POST   /api/investments/cash/add            # Agregar dinero [AUTH]
GET    /api/investments/transactions/history # Historial [AUTH]
```

### Portafolio (`/api/portfolio`)
```
GET /api/portfolio/                # Resumen del portafolio [AUTH]
GET /api/portfolio/net-investment  # Inversión neta [AUTH]
GET /api/portfolio/cash-flow       # Flujo de efectivo [AUTH]
```

### Mercado (`/api/market`)
```
GET /api/market/market-data           # Datos del mercado
GET /api/market/stock-price/:symbol   # Precio de acción
GET /api/market/search-stocks         # Buscar acciones
GET /api/market/historical-data/:symbol # Datos históricos
GET /api/market/market-moves          # Movimientos del mercado
```

## 🔐 Sistema de Autenticación

### Flujo de Autenticación JWT

```javascript
1. Usuario se registra/inicia sesión
   POST /api/auth/login
   {
     "email": "user@example.com",
     "password": "password"
   }

2. Servidor valida credenciales y genera JWT
   Response:
   {
     "success": true,
     "data": {
       "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
       "user": { "id": 1, "username": "john", ... }
     }
   }

3. Cliente almacena token en localStorage
   localStorage.setItem('authToken', token)

4. Todas las peticiones autenticadas incluyen el token
   Headers: {
     "Authorization": "Bearer <token>",
     "x-user-id": "<userId>"  // Fallback
   }

5. Middleware verifica token en cada petición
   jwt.verify(token, JWT_SECRET) → req.user
```

### Middleware de Autenticación

```javascript
// src/middleware/auth.js
const verifyToken = async (req, res, next) => {
  // 1. Extraer token del header Authorization o x-user-id
  // 2. Verificar token JWT
  // 3. Buscar usuario en BD
  // 4. Añadir usuario a req.user
  // 5. Continuar con next()
}
```

## 💾 Modelos de Base de Datos

### Usuario (users)
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,      -- Hash bcrypt
  firstName VARCHAR(255),
  lastName VARCHAR(255),
  cashBalance DECIMAL(12,2) DEFAULT 0, -- Balance de efectivo
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### Inversión (investments)
```sql
CREATE TABLE investments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT REFERENCES users(id),
  symbol VARCHAR(10) NOT NULL,         -- AAPL, GOOGL, etc.
  companyName VARCHAR(255),
  quantity INT NOT NULL,               -- Cantidad de acciones
  purchasePrice DECIMAL(10,2),         -- Precio promedio de compra
  currentPrice DECIMAL(10,2),          -- Precio actual
  totalInvested DECIMAL(12,2),         -- Total invertido
  purchaseDate TIMESTAMP,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### Transacción (transactions)
```sql
CREATE TABLE transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT REFERENCES users(id),
  symbol VARCHAR(10) NOT NULL,
  transactionType ENUM('BUY', 'SELL'),
  quantity INT NOT NULL,
  price DECIMAL(10,2),                 -- Precio por acción
  totalAmount DECIMAL(12,2),           -- Monto total
  transactionDate TIMESTAMP,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

## 🔄 Flujo de Datos Principal

### 1. Compra de Acciones

```javascript
// Frontend: buy-stocks.html
1. Usuario busca acción → GET /api/market/search-stocks?query=AAPL
2. Selecciona acción → GET /api/market/stock-price/AAPL
3. Ingresa cantidad → POST /api/investments/

// Backend: investmentController.js
4. Verificar autenticación (middleware)
5. Obtener precio actual (financeAPI)
6. Verificar balance de efectivo
7. Crear/actualizar inversión (BD)
8. Actualizar balance de efectivo
9. Registrar transacción
10. Responder con éxito
```

### 2. Venta de Acciones

```javascript
// Frontend: manage-investments.html
1. Cargar inversiones → GET /api/investments/
2. Usuario selecciona cantidad → POST /api/investments/:id/sell

// Backend: investmentController.js
3. Verificar autenticación
4. Obtener precio actual
5. Calcular ganancia/pérdida
6. Actualizar/eliminar inversión
7. Actualizar balance de efectivo
8. Registrar transacción
9. Responder con P&L
```

### 3. Dashboard del Portafolio

```javascript
// Frontend: dashboard.html
1. Cargar resumen → GET /api/portfolio/
2. Cargar inversiones → GET /api/investments/

// Backend: portfolioController.js
3. Calcular valor total del portafolio
4. Actualizar precios actuales (financeAPI)
5. Calcular ganancias/pérdidas
6. Generar resumen narrativo
7. Crear gráficos (Chart.js)
```

## 🎨 Frontend - Arquitectura

### Gestión de Estado
```javascript
// Almacenamiento local
localStorage: {
  'authToken': 'JWT_TOKEN',
  'userId': '123',
  'user': '{"id":123,"username":"john",...}'
}

// AuthManager global (js/auth.js)
window.authManager: {
  getAuthHeaders(),     // Headers para peticiones
  isAuthenticated(),    // Verificar estado
  refreshToken(),       // Renovar token
  apiRequest()          // Peticiones autenticadas
}
```

### Comunicación con API
```javascript
// Patrón de petición estándar
async function loadData() {
  try {
    const response = await fetch('/api/endpoint', {
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': localStorage.getItem('userId')
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Actualizar UI
      displayData(result.data);
    } else {
      // Mostrar error
      showMessage(result.message, 'error');
    }
  } catch (error) {
    showMessage('Error de conexión', 'error');
  }
}
```

### Visualización de Datos
```javascript
// Chart.js para gráficos
const chartConfig = {
  type: 'line',
  data: {
    datasets: [...] // Datos de inversiones
  },
  options: {
    responsive: true,
    scales: {
      x: { type: 'time' },  // Escala temporal
      y: { /* configuración */ }
    }
  }
};
```

## 🧪 Servicio de Datos Financieros

### financeAPI.js - Datos Simulados
```javascript
class FinanceAPI {
  // Cache en memoria con precios base realistas
  stockCache = new Map([
    'AAPL' => { basePrice: 175.50, volatility: 0.025 },
    'GOOGL' => { basePrice: 142.80, volatility: 0.030 }
  ]);
  
  async getStockPrice(symbol) {
    // 1. Intentar API real (Yahoo Finance)
    // 2. Si falla, usar datos simulados
    // 3. Aplicar volatilidad realista
    // 4. Cachear por 5 minutos
  }
  
  generateStockData(symbol) {
    // Generar movimientos de precios realistas
    // Basado en volatilidad histórica
  }
}
```

## 🔒 Seguridad Implementada

### 1. Autenticación
- **JWT tokens** con expiración de 24h
- **Passwords hasheados** con bcrypt (12 rounds)
- **Refresh tokens** automático
- **Middleware de verificación** en todas las rutas protegidas

### 2. Autorización
- **Verificación de userId** en cada petición
- **Aislamiento de datos** por usuario
- **Validación de entrada** en controladores

### 3. Base de Datos
- **Transacciones ACID** para operaciones críticas
- **Locks optimistas** para prevenir condiciones de carrera
- **Validaciones** en modelos Sequelize

## 🚀 Configuración y Ejecución

### Variables de Entorno (.env)
```bash
# Base de datos
DB_NAME=portfolio_management
DB_USER=root
DB_PASSWORD=password
DB_HOST=localhost

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=24h

# Servidor
PORT=3000
NODE_ENV=development
```



## 📊 Funcionalidades Principales

### ✅ Implementadas
- [x] **Autenticación JWT** completa
- [x] **Registro y login** de usuarios
- [x] **Compra y venta** de acciones
- [x] **Gestión de efectivo** (balance, depósitos)
- [x] **Portafolio visual** con gráficos
- [x] **Análisis de rendimiento** con P&L
- [x] **Datos de mercado** simulados realistas
- [x] **Historial de transacciones**
- [x] **Dashboard interactivo**

### 🔮 Posibles Mejoras
- [ ] **WebSockets** para precios en tiempo real
- [ ] **API externa real** (Alpha Vantage, IEX)
- [ ] **Notificaciones** push
- [ ] **Alertas de precios**
- [ ] **Análisis técnico** avanzado
- [ ] **Exportación** de reportes
- [ ] **Modo oscuro**
- [ ] **PWA** (Progressive Web App)

## 🐛 Debugging y Logs

### Logs del Servidor
```javascript
// Sequelize logs (development)
logging: process.env.NODE_ENV === 'development' ? console.log : false

// Errores capturados
console.error('Error details:', error);
```

### Herramientas de Desarrollo
- **Chrome DevTools** para debugging del frontend
- **Network tab** para inspeccionar peticiones API
- **Application tab** para localStorage
- **Console** para errores JavaScript

## 📝 Convenciones de Código

### Backend
- **Rutas**: kebab-case (`/api/cash-flow`)
- **Archivos**: camelCase (`authController.js`)
- **Variables**: camelCase (`userId`, `totalInvested`)
- **Constantes**: UPPER_SNAKE_CASE (`JWT_SECRET`)

### Frontend
- **Funciones**: camelCase (`loadInvestments()`)
- **CSS Classes**: kebab-case (`.investment-card`)
- **IDs**: camelCase (`cashBalance`)

### Base de Datos
- **Tablas**: snake_case (`users`, `investments`)
- **Columnas**: camelCase en Sequelize → snake_case en SQL

---

## 🤝 Contribución

Para contribuir al proyecto:

1. **Fork** el repositorio
2. **Crear branch** para features (`git checkout -b feature/nueva-funcionalidad`)
3. **Seguir convenciones** de código establecidas
4. **Probar cambios** localmente
5. **Commit** con mensajes descriptivos
6. **Pull request** con descripción detallada

## 📞 Soporte

Para dudas o problemas:
- Revisar logs del servidor y navegador
- Verificar configuración de variables de entorno
- Comprobar conexión a base de datos
- Consultar este README para arquitectura

---

**Tecnologías utilizadas:** Node.js, Express, MySQL, Sequelize, JWT, Chart.js, HTML5, CSS3, JavaScript ES6+