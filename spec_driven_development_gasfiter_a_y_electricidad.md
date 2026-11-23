# Especificación de Desarrollo Basado en Requisitos (Spec-Driven Development)
## Sistema de Control de Insumos: Gasfitería y Electricidad (PAB-IN v2.0)

---

## 1. Resumen Ejecutivo y Alcance
El objetivo es extender y adaptar la plataforma web **PAB-IN** existente para gestionar el control de inventario y los movimientos (ingresos, salidas, saldos y trazabilidad de destino) de dos nuevos rubros técnicos: **Gasfitería** y **Electricidad**.

### Objetivos Clave
1. **Unificación de Datos:** Modelar en Firestore un esquema capaz de manejar ambos dominios (Gasfitería con categorías y Electricidad con especificaciones de material).
2. **Kardex Automático:** Calcular saldos en tiempo real tras cada ingreso o salida.
3. **Imputación de Destinos:** Registrar el técnico responsable y la ubicación/pabellón exacta de aplicación del insumo.
4. **Exportación y Auditoría:** Generar reportes tabulares y exportación en CSV/Excel con filtros combinados por año, mes, categoría, tipo de movimiento y responsable.

---

## 2. Requisitos Funcionales (RF)

| ID | Módulo | Requisito | Descripción |
| :--- | :--- | :--- | :--- |
| **RF-01** | Autenticación | Control de Acceso por Rol | Autenticación vía Firebase Auth con distinción de roles (`ADMIN` y `OPERADOR`). |
| **RF-02** | Movimientos | Registro de Ingreso | Permite registrar stock entrante. Incrementa el saldo disponible y no exige responsable ni ubicación. |
| **RF-03** | Movimientos | Registro de Salida | Permite registrar despacho de insumos. Descuenta del saldo (ingresado como valor negativo o positivo convertido a resta), requiere de forma obligatoria `Responsable` y `Ubicación/Observación`. |
| **RF-04** | Kardex | Cálculo del Saldo | Actualiza en tiempo real el saldo de cada insumo tras procesar la transacción en un batch o transacción atómica de Firestore. |
| **RF-05** | Catálogos | Categorías y Tipos | Gestión dinámica de categorías para Gasfitería (ej. *Conexiones*, *Grifería y Válvulas*, *Tuberías*, *Sanitarios*, *Otros*) y clasificaciones para Electricidad (ej. *Iluminación*, *Cableado*, *Cajas/Accesorios*). |
| **RF-06** | Consultas | Filtros y Búsqueda | Filtrado en tiempo real por Rubro (*Gasfitería* / *Electricidad*), Tipo de Movimiento (*Ingreso* / *Salida*), Rango de Fechas, Categoría, Responsable y Ubicación. |
| **RF-07** | Reportes | Exportación de Kardex | Exportación a CSV/Excel del historial de movimientos y resumen de saldos actuales por rubro. |

---

## 3. Requisitos No Funcionales (RNF)

* **RNF-01 Integridad de Transacciones:** Las operaciones de registro de movimientos e incrementos/decrementos del saldo global del insumo deben ejecutarse dentro de una transacción atómica (`runTransaction`) de Firestore para evitar condiciones de carrera (*race conditions*).
* **RNF-02 Rendimiento:** Las búsquedas e historial de movimientos deben cargar en menos de 1.5 segundos utilizando índices compuestos en Firestore (`rubro` + `fecha` / `rubro` + `material`).
* **RNF-03 Compatibilidad:** Interfaz adaptativa (Responsive UI) funcional en dispositivos móviles (tablets/smartphones de operadores) y escritorios usando Tailwind CSS y la tipografía actual del proyecto (`Outfit` e `Inter`).

---

## 4. Modelo de Datos (Firestore Schema)

```text
/
├── catalogos (collection)
│   ├── gasfiteria_materiales (doc) -> { lista: [{ codigo, nombre, categoria, stock_actual }] }
│   ├── electricidad_materiales (doc) -> { lista: [{ codigo, nombre, tipo, stock_actual }] }
│   ├── gasfiteria_categorias (doc) -> { lista: ["Conexiones", "Grifería y válvulas", "Tuberías", "Sanitarios y desagüe", "Otros"] }
│   └── responsables (doc) -> { lista: ["Fernando Sánchez", "Jean Paul Arrieta", "Fredy Barzola", "José Cárdenas", ...] }
│
└── registros_movimientos (collection)
    └── {movimientoId} (doc)
        ├── id_movimiento: string          // ej: "MOV-000084"
        ├── rubro: string                  // "GASFITERIA" | "ELECTRICIDAD"
        ├── fecha: string                  // YYYY-MM-DD
        ├── anio: number                   // ej: 2026
        ├── mes: string                    // ej: "Junio"
        ├── material: string               // Nombre del insumo
        ├── categoria: string | null       // Aplica para Gasfitería (opcional en Electricidad)
        ├── tipo_movimiento: string        // "Ingreso" | "Salida"
        ├── cantidad: number               // Positivo para Ingreso, Negativo para Salida
        ├── saldo_resultante: number       // Saldo calculado en el momento del movimiento
        ├── responsable: string | null     // Requerido en Salida
        ├── ubicacion_observacion: string  // Requerido en Salida (ej: "H - sshh damas 6to piso")
        ├── operador_uid: string           // UID de Firebase Auth del usuario que registra
        └── timestamp: Timestamp           // serverTimestamp()
```

---

## 5. Estructura de Proyecto (Nuevos Módulos y Modificaciones)

Se reutiliza la arquitectura Single Page Application (SPA) modular del repositorio `PAB-IN`:

```text
public/
├── assets/
│   └── css/
│       └── styles.css
├── js/
│   ├── app.js
│   ├── firebase-config.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── catalogos.service.js
│   │   ├── entregas.service.js
│   │   ├── movimientos.service.js     <-- [NUEVO] Lógica de transacciones Kardex
│   │   └── users.service.js
│   ├── utils/
│   │   ├── export.js                  <-- Adaptar para columnas Kardex (Saldo, Responsable, Ubicación)
│   │   └── validators.js              <-- Validaciones de stock negativo y salidas
│   └── views/
│       ├── admin.view.js
│       ├── login.view.js
│       ├── operador.view.js           <-- Incorporar pestañas Gasfitería / Electricidad
│       ├── gasfiteria.view.js         <-- [NUEVO] Módulo específico
│       └── electricidad.view.js       <-- [NUEVO] Módulo específico
└── index.html
```

---

## 6. Lógica de Servicio Kardex (`movimientos.service.js`)

Especificación de la función atómica para procesar entradas y salidas evitando saldos negativos o datos inconsistentes:

```javascript
import { db } from "../firebase-config.js";
import { 
  collection, doc, runTransaction, serverTimestamp, query, where, getDocs, orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Registra un movimiento de insumo (Gasfitería o Electricidad) de forma atómica.
 */
export async function registrarMovimientoKardex({
  rubro, // "GASFITERIA" | "ELECTRICIDAD"
  fecha,
  material,
  categoria = null,
  tipoMovimiento, // "Ingreso" | "Salida"
  cantidad, // Número entero positivo
  responsable = null,
  ubicacionObservacion = null,
  operadorUid
}) {
  const catalogDocId = rubro === "GASFITERIA" ? "gasfiteria_materiales" : "electricidad_materiales";
  const catalogRef = doc(db, "catalogos", catalogDocId);
  const movCollectionRef = collection(db, "registros_movimientos");

  return await runTransaction(db, async (transaction) => {
    const catalogSnap = await transaction.get(catalogRef);
    if (!catalogSnap.exists()) {
      throw new Error(`El catálogo ${rubro} no existe.`);
    }

    const materialesList = catalogSnap.data().lista || [];
    const matIndex = materialesList.findIndex(m => m.nombre === material);

    if (matIndex === -1) {
      throw new Error(`El material "${material}" no está registrado en el catálogo.`);
    }

    const stockActual = materialesList[matIndex].stock_actual || 0;
    let nuevoSaldo = stockActual;
    let cantidadSigno = cantidad;

    if (tipoMovimiento === "Salida") {
      if (stockActual < cantidad) {
        throw new Error(`Stock insuficiente. Stock actual: ${stockActual}, solicitado: ${cantidad}`);
      }
      nuevoSaldo = stockActual - cantidad;
      cantidadSigno = -Math.abs(cantidad);
    } else {
      nuevoSaldo = stockActual + Math.abs(cantidad);
      cantidadSigno = Math.abs(cantidad);
    }

    // Actualizar catálogo
    materialesList[matIndex].stock_actual = nuevoSaldo;
    transaction.update(catalogRef, { lista: materialesList });

    // Generar correlativo ID
    const autoId = doc(movCollectionRef).id;
    const dateObj = new Date(fecha + "T00:00:00");
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    
    const nuevoMovimiento = {
      id_movimiento: `MOV-${Date.now().toString().slice(-6)}`,
      rubro,
      fecha,
      anio: dateObj.getFullYear(),
      mes: meses[dateObj.getMonth()],
      material,
      categoria,
      tipo_movimiento: tipoMovimiento,
      cantidad: cantidadSigno,
      saldo_resultante: nuevoSaldo,
      responsable: tipoMovimiento === "Salida" ? responsable : null,
      ubicacion_observacion: tipoMovimiento === "Salida" ? ubicacionObservacion : null,
      operador_uid: operadorUid,
      timestamp: serverTimestamp()
    };

    const newMovRef = doc(db, "registros_movimientos", autoId);
    transaction.set(newMovRef, nuevoMovimiento);

    return nuevoMovimiento;
  });
}
```

---

## 7. Diseño de Interfaz y Formularios

### Formulario de Registro de Salida (Operador)
1. **Selector de Rubro:** Botones conmutadores `[ 🔧 Gasfitería ]` / `[ ⚡ Electricidad ]`.
2. **Selección de Insumo:** Auto-completable con visualización en tiempo real del saldo disponible.
3. **Categoría:** Auto-completada según el insumo seleccionado (en Gasfitería).
4. **Validación de Salida:**
   * Campo `Cantidad`: Input numérico positivo.
   * Campo `Responsable`: Dropdown / Input obligatorio (*ej. Fernando Sánchez, Fredy Barzola*).
   * Campo `Ubicación / Destino`: Textinput obligatorio (*ej. "H - sshh damas 6to piso", "J - 103 Minas"*).

### Vista Kardex (Tabla de Control)
Columnas estándar para ambas vistas de consulta:

| ID Mov. | Fecha | Material | Categoría / Tipo | Movimiento | Cant. | Saldo | Responsable | Ubicación / Observación |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `MOV-000078` | 22/06/2026 | CAÑO DE LAVADERO - TEMPORIZADO | Grifería y válvulas | Salida | -1 | 0 | Fernando Sánchez | H - sshh damas 6to piso |
| `MOV-000069` | 23/06/2026 | PANEL LED 18 WATTS - FSL | Iluminación | Salida | -1 | 51 | Fredy Barzola | J - 103 Minas |

---

## 8. Plan de Implementación

1. **Fase 1 (Base de Datos):** Crear documentos iniciales de catálogos en Firestore (`gasfiteria_materiales`, `electricidad_materiales`) poblando los ítems base extraídos de las tablas del usuario.
2. **Fase 2 (Servicios JS):** Crear `movimientos.service.js` con las transacciones de Firestore para actualización atómica del saldo.
3. **Fase 3 (Vistas de Usuario):** Desarrollar los módulos UI para Gasfitería y Electricidad en la interfaz del Operador y Administrador.
4. **Fase 4 (Exportación):** Actualizar `utils/export.js` para generar reportes estructurados compatibles con Excel/CSV incluyendo Responsable y Ubicación.